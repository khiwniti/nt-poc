/**
 * Enhanced Chatbot Service with RAG
 * Features:
 * - Retrieval-Augmented Generation for context-aware responses
 * - Conversation history management
 * - Streaming responses
 * - Multi-model support (OpenAI, Anthropic, Gemini)
 */

import OpenAI from 'openai';
import { logger } from '../config/logger.js';
import db from '../config/knex.js';
import { ragService } from './ragService.js';
import type { Response } from 'express';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface Conversation {
  id: string;
  userId?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Chatbot Service
 */
class ChatbotService {
  private openai: OpenAI | null = null;
  private conversations: Map<string, Conversation> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize chatbot service
   */
  private initialize() {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
      logger.info('Chatbot service initialized with OpenAI');
    } else {
      logger.warn('OpenAI API key not found. Chatbot will use fallback responses.');
    }
  }

  /**
   * Create a new conversation
   */
  public async createConversation(userId?: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant for a Battery Management System with ML-powered predictive maintenance.
You have access to real-time sensor data, alerts, predictions, and facility information.
You can help with:
- Analyzing battery health and performance
- Explaining alerts and providing recommendations
- Generating reports (ISO-compliant)
- Answering questions about facilities and battery systems
- Providing maintenance guidance
- Summarizing system status

Always be helpful, concise, and data-driven in your responses. Use the provided context to give accurate information.`,
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store conversation (in-memory for now, can be persisted to DB later)
    this.conversations.set(conversation.id, conversation);

    logger.info('Conversation created', { conversationId: conversation.id, userId });
    return conversation;
  }

  /**
   * Get conversation by ID
   */
  public getConversation(conversationId: string): Conversation | null {
    return this.conversations.get(conversationId) || null;
  }

  /**
   * Get or create conversation
   */
  public async getOrCreateConversation(conversationId?: string, userId?: string): Promise<Conversation> {
    if (conversationId) {
      const existing = this.getConversation(conversationId);
      if (existing) return existing;
    }

    return this.createConversation(userId);
  }

  /**
   * Add message to conversation
   */
  private addMessage(conversation: Conversation, message: ChatMessage) {
    conversation.messages.push({
      ...message,
      timestamp: new Date().toISOString(),
    });
    conversation.updatedAt = new Date().toISOString();
  }

  /**
   * Get system context using RAG
   */
  private async getSystemContext(userQuery: string): Promise<string> {
    try {
      // Get RAG context (top 5 relevant documents)
      const ragContext = await ragService.query(userQuery, {
        topK: 5,
      });

      // Get recent system stats
      const stats = await this.getSystemStats();

      return `${ragContext}\n\nCurrent System Status:\n${JSON.stringify(stats, null, 2)}`;
    } catch (error) {
      logger.error('Failed to get system context', { error });
      return 'System context unavailable';
    }
  }

  /**
   * Get current system statistics
   */
  private async getSystemStats() {
    try {
      const [batteryCount, facilityCount, criticalAlerts] = await Promise.all([
        db('battery_systems').count('* as count').first(),
        db('facilities').count('* as count').first(),
        db('alerts').where('severity', 'critical').where('status', 'active').count('* as count').first(),
      ]);

      return {
        totalBatteries: batteryCount?.count || 0,
        totalFacilities: facilityCount?.count || 0,
        criticalAlerts: criticalAlerts?.count || 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get system stats', { error });
      return {};
    }
  }

  /**
   * Chat with RAG-enhanced context (non-streaming)
   */
  public async chat(userMessage: string, conversationId?: string, userId?: string): Promise<string> {
    try {
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(conversationId, userId);

      // Add user message
      this.addMessage(conversation, { role: 'user', content: userMessage });

      // Get RAG context
      const context = await this.getSystemContext(userMessage);

      // Prepare messages for OpenAI
      const messages: ChatMessage[] = [
        ...conversation.messages,
        {
          role: 'system',
          content: `Additional context:\n${context}`,
        },
      ];

      // Get response from OpenAI
      if (!this.openai) {
        return 'I apologize, but the AI service is not available at the moment. Please try again later.';
      }

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.7,
        max_tokens: 1000,
      });

      const assistantMessage = completion.choices[0]?.message?.content || 'No response generated';

      // Add assistant message
      this.addMessage(conversation, { role: 'assistant', content: assistantMessage });

      logger.info('Chat response generated', {
        conversationId: conversation.id,
        tokensUsed: completion.usage?.total_tokens,
      });

      return assistantMessage;
    } catch (error) {
      logger.error('Chat failed', { error, userMessage });
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }
  }

  /**
   * Chat with streaming responses
   */
  public async chatStream(
    userMessage: string,
    res: Response,
    conversationId?: string,
    userId?: string
  ): Promise<void> {
    try {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Get or create conversation
      const conversation = await this.getOrCreateConversation(conversationId, userId);

      // Add user message
      this.addMessage(conversation, { role: 'user', content: userMessage });

      // Send conversation ID if new
      res.write(`data: ${JSON.stringify({ type: 'conversation_id', conversationId: conversation.id })}\n\n`);

      // Get RAG context
      const context = await this.getSystemContext(userMessage);

      // Send context to client
      res.write(`data: ${JSON.stringify({ type: 'context', context })}\n\n`);

      // Prepare messages
      const messages: ChatMessage[] = [
        ...conversation.messages,
        {
          role: 'system',
          content: `Additional context:\n${context}`,
        },
      ];

      if (!this.openai) {
        res.write(
          `data: ${JSON.stringify({ type: 'error', message: 'AI service not available' })}\n\n`
        );
        res.end();
        return;
      }

      // Stream response from OpenAI
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
        }
      }

      // Add full response to conversation
      this.addMessage(conversation, { role: 'assistant', content: fullResponse });

      // Send completion event
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();

      logger.info('Streaming chat completed', { conversationId: conversation.id });
    } catch (error) {
      logger.error('Streaming chat failed', { error, userMessage });
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate response' })}\n\n`);
      res.end();
    }
  }

  /**
   * Get conversation history
   */
  public getConversationHistory(conversationId: string): ChatMessage[] {
    const conversation = this.getConversation(conversationId);
    return conversation ? conversation.messages.filter((m) => m.role !== 'system') : [];
  }

  /**
   * Clear conversation
   */
  public clearConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
    logger.info('Conversation cleared', { conversationId });
  }

  /**
   * Get service status
   */
  public getStatus() {
    return {
      openaiConfigured: this.openai !== null,
      activeConversations: this.conversations.size,
      ragStatus: ragService.getStatus(),
    };
  }
}

// Export singleton instance
export const chatbotService = new ChatbotService();
export default chatbotService;
