import OpenAI from 'openai';
import logger from '../config/logger.js';
import backendApi from './backendApi.js';

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

interface ConversationContext {
  userId: string;
  messages: ConversationMessage[];
  lastUpdated: number;
}

// Store conversation contexts (in-memory, consider Redis for production)
const conversationContexts = new Map<string, ConversationContext>();
const CONTEXT_EXPIRY = 30 * 60 * 1000; // 30 minutes

export class AIResponseService {
  private openai: OpenAI;
  private systemPrompt: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.GITHUB_TOKEN || 'dummy-key',
      baseURL: process.env.AI_BASE_URL || process.env.GITHUB_MODEL_ENDPOINT || undefined,
    });

    this.systemPrompt = `You are an intelligent assistant for a Battery Management System (BMS) monitoring platform.
You help facility operators monitor battery systems, check alerts, and get predictions about battery health.

Your capabilities include:
- Checking facility status and health
- Viewing and analyzing alerts (critical, warning, info)
- Getting battery system predictions and remaining useful life (RUL)
- Providing statistics and trends
- Acknowledging alerts
- Explaining technical terms in simple language

Language Support:
- Respond in the same language as the user's question
- Support both English and Thai (ภาษาไทย)
- Use appropriate technical terms for each language

When responding:
- Be concise and clear (suitable for chat)
- Use friendly but professional tone
- Provide actionable information
- Ask clarifying questions when needed
- Use emojis sparingly to enhance readability
- Format numbers clearly (e.g., "85.5%" not "0.855")
- If user writes in Thai, respond in Thai
- If user writes in English, respond in English`;
  }

  /**
   * Get or create conversation context for a user
   */
  private getContext(userId: string): ConversationContext {
    let context = conversationContexts.get(userId);

    // Clean up expired or create new context
    if (!context || Date.now() - context.lastUpdated > CONTEXT_EXPIRY) {
      context = {
        userId,
        messages: [{ role: 'system', content: this.systemPrompt }],
        lastUpdated: Date.now(),
      };
      conversationContexts.set(userId, context);
    }

    return context;
  }

  /**
   * Update conversation context
   */
  private updateContext(userId: string, role: 'user' | 'assistant', content: string): void {
    const context = this.getContext(userId);
    context.messages.push({ role, content });
    context.lastUpdated = Date.now();

    // Keep only last 10 messages to avoid token limits
    if (context.messages.length > 11) {
      // Keep system prompt + last 10
      context.messages = [context.messages[0], ...context.messages.slice(-10)];
    }
  }

  /**
   * Clear conversation context for a user
   */
  clearContext(userId: string): void {
    conversationContexts.delete(userId);
  }

  /**
   * Available functions that AI can call
   */
  private readonly functions = [
    {
      name: 'get_facilities',
      description: 'Get list of all facilities with their health status',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_facility_details',
      description: 'Get detailed information about a specific facility including KPIs',
      parameters: {
        type: 'object',
        properties: {
          facilityId: {
            type: 'string',
            description: 'The ID of the facility to get details for',
          },
        },
        required: ['facilityId'],
      },
    },
    {
      name: 'get_alert_summary',
      description: 'Get summary of active alerts (critical, warning, info counts)',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_alerts',
      description: 'Get list of alerts with optional filters',
      parameters: {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            enum: ['critical', 'warning', 'info'],
            description: 'Filter by severity level',
          },
          status: {
            type: 'string',
            enum: ['active', 'acknowledged', 'resolved'],
            description: 'Filter by alert status',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of alerts to return (default 10)',
          },
        },
      },
    },
    {
      name: 'get_alert_details',
      description: 'Get detailed information about a specific alert',
      parameters: {
        type: 'object',
        properties: {
          alertId: {
            type: 'string',
            description: 'The ID of the alert',
          },
        },
        required: ['alertId'],
      },
    },
    {
      name: 'acknowledge_alert',
      description: 'Acknowledge an alert to mark it as seen',
      parameters: {
        type: 'object',
        properties: {
          alertId: {
            type: 'string',
            description: 'The ID of the alert to acknowledge',
          },
        },
        required: ['alertId'],
      },
    },
    {
      name: 'get_battery_prediction',
      description: 'Get the latest RUL (Remaining Useful Life) prediction for a battery system',
      parameters: {
        type: 'object',
        properties: {
          batteryId: {
            type: 'string',
            description: 'The ID of the battery system',
          },
        },
        required: ['batteryId'],
      },
    },
    {
      name: 'search_facilities',
      description: 'Search for facilities by name or location',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for facility name or location',
          },
        },
        required: ['query'],
      },
    },
  ];

  /**
   * Execute function calls from AI
   */
  private async executeFunction(functionName: string, args: any): Promise<string> {
    try {
      logger.info(`Executing function: ${functionName}`, { args });

      switch (functionName) {
        case 'get_facilities': {
          const facilities = await backendApi.getFacilities();
          return JSON.stringify({
            count: facilities.length,
            facilities: facilities.map((f) => ({
              id: f.id,
              name: f.name,
              location: f.location,
              healthStatus: f.health?.status || 'unknown',
              healthScore: f.health?.score || 0,
            })),
          });
        }

        case 'get_facility_details': {
          const facility = await backendApi.getFacility(args.facilityId);
          const kpis = await backendApi.getFacilityKpis(args.facilityId);
          return JSON.stringify({ facility, kpis });
        }

        case 'get_alert_summary': {
          const summary = await backendApi.getAlertSummary();
          return JSON.stringify(summary);
        }

        case 'get_alerts': {
          const alerts = await backendApi.getAlerts({
            severity: args.severity,
            status: args.status,
            limit: args.limit || 10,
          });
          return JSON.stringify({
            count: alerts.length,
            alerts: alerts.map((a) => ({
              id: a.id,
              type: a.type,
              severity: a.severity,
              status: a.status,
              message: a.message,
              createdAt: new Date(a.createdAt).toISOString(),
            })),
          });
        }

        case 'get_alert_details': {
          const alert = await backendApi.getAlert(args.alertId);
          return JSON.stringify(alert);
        }

        case 'acknowledge_alert': {
          const success = await backendApi.acknowledgeAlert(args.alertId);
          return JSON.stringify({ success, alertId: args.alertId });
        }

        case 'get_battery_prediction': {
          const prediction = await backendApi.getLatestPrediction(args.batteryId);
          return JSON.stringify(prediction);
        }

        case 'search_facilities': {
          const facilities = await backendApi.searchFacilities(args.query);
          return JSON.stringify({
            count: facilities.length,
            query: args.query,
            facilities: facilities.map((f) => ({
              id: f.id,
              name: f.name,
              location: f.location,
              healthStatus: f.health?.status || 'unknown',
            })),
          });
        }

        default:
          return JSON.stringify({ error: 'Unknown function' });
      }
    } catch (error) {
      logger.error(`Error executing function ${functionName}:`, error);
      return JSON.stringify({ error: 'Function execution failed' });
    }
  }

  /**
   * Generate AI response with function calling capability
   */
  async generateResponse(userMessage: string, userId: string): Promise<string> {
    try {
      // Get conversation context
      const context = this.getContext(userId);

      // Add user message to context
      this.updateContext(userId, 'user', userMessage);

      // Call OpenAI with function calling
      let response = await this.openai.chat.completions.create({
        model: process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o',
        messages: context.messages as any,
        functions: this.functions as any,
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 500,
      });

      let assistantMessage = response.choices[0].message;

      // Handle function calls (may need multiple iterations)
      let iterations = 0;
      const maxIterations = 5;

      while (assistantMessage.function_call && iterations < maxIterations) {
        iterations++;

        const functionName = assistantMessage.function_call.name;
        const functionArgs = JSON.parse(assistantMessage.function_call.arguments || '{}');

        logger.info(`AI wants to call function: ${functionName}`, { args: functionArgs });

        // Execute the function
        const functionResult = await this.executeFunction(functionName, functionArgs);

        // Add function call and result to messages
        context.messages.push({
          role: 'assistant',
          content: '',
          name: functionName,
        });
        context.messages.push({
          role: 'function',
          name: functionName,
          content: functionResult,
        });

        // Get next response from AI
        response = await this.openai.chat.completions.create({
          model: process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o',
          messages: context.messages as any,
          functions: this.functions as any,
          function_call: 'auto',
          temperature: 0.7,
          max_tokens: 500,
        });

        assistantMessage = response.choices[0].message;
      }

      // Get final response text
      const finalResponse =
        assistantMessage.content ||
        'I processed your request but encountered an issue generating a response.';

      // Update context with assistant response
      this.updateContext(userId, 'assistant', finalResponse);

      return finalResponse;
    } catch (error) {
      logger.error('Error generating AI response:', error);

      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          return 'I apologize, but my AI service is not properly configured. Please contact support.';
        }
        if (error.message.includes('timeout')) {
          return 'The request took too long. Please try again.';
        }
      }

      return 'I encountered an error while processing your request. Please try again later.';
    }
  }

  /**
   * Get conversation history for a user
   */
  getConversationHistory(userId: string): ConversationMessage[] {
    const context = conversationContexts.get(userId);
    return context?.messages || [];
  }

  /**
   * Clean up expired contexts (should be called periodically)
   */
  cleanupExpiredContexts(): void {
    const now = Date.now();
    for (const [userId, context] of conversationContexts.entries()) {
      if (now - context.lastUpdated > CONTEXT_EXPIRY) {
        conversationContexts.delete(userId);
        logger.info(`Cleaned up expired context for user ${userId}`);
      }
    }
  }
}

export default new AIResponseService();
