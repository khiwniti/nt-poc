import { messagingApi, WebhookEvent, Message } from '@line/bot-sdk';
import logger from '../config/logger.js';
import aiResponseService from './aiResponse.js';
import backendApi from './backendApi.js';
import richMessages from './richMessages.js';

export class LineBotService {
  private client: messagingApi.MessagingApiClient;
  private channelAccessToken: string;

  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

    if (!this.channelAccessToken || !channelSecret) {
      logger.warn('Line Channel Access Token or Secret not provided. Line Bot service will be disabled.');
    }

    this.client = new messagingApi.MessagingApiClient({
      channelAccessToken: this.channelAccessToken,
    });

    // Start cleanup job for expired conversation contexts
    setInterval(() => {
      aiResponseService.cleanupExpiredContexts();
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  /**
   * Detect user intent from message
   */
  private detectIntent(message: string): {
    intent: string;
    entities?: any;
  } {
    const lower = message.toLowerCase().trim();

    // Greetings
    if (/^(hi|hello|hey|สวัสดี)/i.test(lower)) {
      return { intent: 'greeting' };
    }

    // Help
    if (/^(help|commands|what can you do|\?|ช่วย)/i.test(lower)) {
      return { intent: 'help' };
    }

    // Main menu
    if (/^(menu|main|home|start|เมนู)/i.test(lower)) {
      return { intent: 'main_menu' };
    }

    // Facilities
    if (/facilities|facility|show (all )?facilities|list facilities/i.test(lower)) {
      return { intent: 'list_facilities' };
    }

    // Alerts
    if (/alert summary|show alerts?|check alerts?/i.test(lower)) {
      return { intent: 'alert_summary' };
    }

    if (/critical alerts?|show critical/i.test(lower)) {
      return { intent: 'critical_alerts' };
    }

    if (/warning alerts?|show warnings?/i.test(lower)) {
      return { intent: 'warning_alerts' };
    }

    // Status
    if (/status|system status|health/i.test(lower)) {
      return { intent: 'system_status' };
    }

    // Clear context
    if (/^(clear|reset|new conversation|เริ่มใหม่)/i.test(lower)) {
      return { intent: 'clear_context' };
    }

    // Default to AI conversation
    return { intent: 'ai_conversation' };
  }

  /**
   * Handle intent-based responses
   */
  private async handleIntent(
    intent: string,
    userId: string,
    originalMessage: string
  ): Promise<Message[]> {
    const messages: Message[] = [];

    try {
      switch (intent) {
        case 'greeting': {
          messages.push({
            type: 'text',
            text: '👋 สวัสดีครับ/ค่ะ! ฉันคือผู้ช่วยระบบจัดการแบตเตอรี่\n\nฉันสามารถช่วยคุณ:\n• ติดตามสถานะโรงงาน\n• ตรวจสอบการแจ้งเตือน\n• ดูการคาดการณ์\n• ตรวจสอบสถานะระบบ\n\nคุณต้องการทราบอะไรครับ/คะ?\n\n---\n\n👋 Hello! I\'m your Battery Management System assistant.\n\nI can help you:\n• Monitor facilities\n• Check alerts\n• View predictions\n• Get system status\n\nWhat would you like to know?',
            quickReply: richMessages.createQuickReply('main'),
          });
          break;
        }

        case 'help': {
          messages.push({
            type: 'text',
            text: '🤖 คำสั่งที่ใช้ได้:\n\n📋 โรงงาน\n• "แสดงโรงงาน" - รายการโรงงานทั้งหมด\n• "ค้นหา [ชื่อ]" - ค้นหาโรงงาน\n\n🚨 การแจ้งเตือน\n• "แสดงการแจ้งเตือน" - สรุปการแจ้งเตือน\n• "แจ้งเตือนวิกฤติ" - แจ้งเตือนวิกฤติเท่านั้น\n• "รับทราบการแจ้งเตือน [id]" - ทำเครื่องหมายว่าอ่านแล้ว\n\n📊 สถานะ\n• "สถานะระบบ" - สุขภาพโดยรวม\n• "การคาดการณ์แบตเตอรี่ [id]" - คาดการณ์ RUL\n\n💬 ภาษาธรรมชาติ\nคุณสามารถถามคำถามได้ตามปกติ!\n\n---\n\n🤖 Available Commands:\n\n📋 Facilities\n• "Show facilities" - List all\n• "Search [name]" - Find specific\n\n🚨 Alerts\n• "Show alerts" - Summary\n• "Critical alerts" - Critical only\n• "Acknowledge alert [id]" - Mark as seen\n\n📊 Status\n• "System status" - Overall health\n• "Battery prediction [id]" - RUL forecast\n\n💬 Natural Language\nJust ask me questions naturally!\n\nExamples:\n• "How many critical alerts?"\n• "What\'s the health of facility X?"\n• "Show battery predictions"',
            quickReply: richMessages.createQuickReply('main'),
          });
          break;
        }

        case 'main_menu': {
          messages.push({
            type: 'text',
            text: '🏠 เมนูหลัก / Main Menu\n\nคุณต้องการทำอะไรครับ/คะ?\nWhat would you like to do?',
            quickReply: richMessages.createQuickReply('main'),
          });
          break;
        }

        case 'list_facilities': {
          const facilities = await backendApi.getFacilities();
          
          if (facilities.length === 0) {
            messages.push({
              type: 'text',
              text: 'No facilities found in the system.',
              quickReply: richMessages.createQuickReply('main'),
            });
          } else {
            messages.push({
              type: 'text',
              text: `Found ${facilities.length} facilities:`,
            });

            // Send up to 5 facility cards
            for (const facility of facilities.slice(0, 5)) {
              const kpis = await backendApi.getFacilityKpis(facility.id);
              messages.push(
                richMessages.createFacilityCard({
                  id: facility.id,
                  name: facility.name,
                  location: facility.location,
                  healthStatus: facility.health?.status || 'unknown',
                  healthScore: facility.health?.score || 0,
                  totalCapacity: kpis?.totalCapacity,
                  averageSoC: kpis?.averageSoC,
                  activeAlerts: kpis?.activeAlerts,
                })
              );
            }

            if (facilities.length > 5) {
              messages.push({
                type: 'text',
                text: `... and ${facilities.length - 5} more facilities.\nAsk me about a specific facility for details!`,
                quickReply: richMessages.createQuickReply('facilities'),
              });
            } else {
              messages.push({
                type: 'text',
                text: 'Ask me about any facility for more details!',
                quickReply: richMessages.createQuickReply('facilities'),
              });
            }
          }
          break;
        }

        case 'alert_summary': {
          const summary = await backendApi.getAlertSummary();
          messages.push(richMessages.createAlertSummaryCard(summary));
          
          if (summary.total > 0) {
            messages.push({
              type: 'text',
              text: 'Would you like to see specific alerts?',
              quickReply: richMessages.createQuickReply('alerts'),
            });
          }
          break;
        }

        case 'critical_alerts': {
          const alerts = await backendApi.getAlerts({
            severity: 'critical',
            status: 'active',
            limit: 5,
          });

          if (alerts.length === 0) {
            messages.push({
              type: 'text',
              text: '✅ No critical alerts at this time.',
              quickReply: richMessages.createQuickReply('alerts'),
            });
          } else {
            messages.push({
              type: 'text',
              text: `🔴 Found ${alerts.length} critical alerts:`,
            });

            for (const alert of alerts) {
              messages.push(
                richMessages.createAlertCard({
                  id: alert.id,
                  type: alert.type,
                  severity: alert.severity,
                  status: alert.status,
                  message: alert.message,
                  createdAt: new Date(alert.createdAt).toISOString(),
                  batterySystemId: alert.batterySystemId,
                })
              );
            }

            messages.push({
              type: 'text',
              text: 'You can acknowledge alerts by saying "Acknowledge alert [id]"',
              quickReply: richMessages.createQuickReply('alerts'),
            });
          }
          break;
        }

        case 'warning_alerts': {
          const alerts = await backendApi.getAlerts({
            severity: 'warning',
            status: 'active',
            limit: 5,
          });

          if (alerts.length === 0) {
            messages.push({
              type: 'text',
              text: '✅ No warning alerts at this time.',
              quickReply: richMessages.createQuickReply('alerts'),
            });
          } else {
            messages.push({
              type: 'text',
              text: `⚠️ Found ${alerts.length} warning alerts:`,
            });

            for (const alert of alerts.slice(0, 3)) {
              messages.push(
                richMessages.createAlertCard({
                  id: alert.id,
                  type: alert.type,
                  severity: alert.severity,
                  status: alert.status,
                  message: alert.message,
                  createdAt: new Date(alert.createdAt).toISOString(),
                  batterySystemId: alert.batterySystemId,
                })
              );
            }

            if (alerts.length > 3) {
              messages.push({
                type: 'text',
                text: `... and ${alerts.length - 3} more warning alerts.`,
                quickReply: richMessages.createQuickReply('alerts'),
              });
            }
          }
          break;
        }

        case 'system_status': {
          const summary = await backendApi.getAlertSummary();
          const facilities = await backendApi.getFacilities();
          const healthyCount = facilities.filter(
            (f) => f.health?.status?.toLowerCase().includes('good') || 
                   f.health?.status?.toLowerCase().includes('healthy')
          ).length;

          messages.push({
            type: 'text',
            text: `📊 System Status\n\n` +
                  `🏢 Facilities: ${facilities.length}\n` +
                  `✅ Healthy: ${healthyCount}\n` +
                  `⚠️ With Issues: ${facilities.length - healthyCount}\n\n` +
                  `🚨 Active Alerts:\n` +
                  `  🔴 Critical: ${summary.critical}\n` +
                  `  🟡 Warning: ${summary.warning}\n` +
                  `  🔵 Info: ${summary.info}\n` +
                  `  Total: ${summary.total}`,
            quickReply: richMessages.createQuickReply('main'),
          });
          break;
        }

        case 'clear_context': {
          aiResponseService.clearContext(userId);
          messages.push({
            type: 'text',
            text: '🔄 Conversation cleared! Starting fresh.\n\nHow can I help you?',
            quickReply: richMessages.createQuickReply('main'),
          });
          break;
        }

        case 'ai_conversation':
        default: {
          // Use AI with function calling for complex queries
          const aiResponse = await aiResponseService.generateResponse(originalMessage, userId);
          messages.push({
            type: 'text',
            text: aiResponse,
            quickReply: richMessages.createQuickReply('main'),
          });
          break;
        }
      }
    } catch (error) {
      logger.error('Error handling intent:', error);
      messages.push({
        type: 'text',
        text: 'Sorry, I encountered an error processing your request. Please try again.',
        quickReply: richMessages.createQuickReply('main'),
      });
    }

    return messages;
  }

  /**
   * Handle incoming webhook events
   */
  async handleEvent(event: WebhookEvent): Promise<void> {
    try {
      // Handle text messages
      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId || 'unknown';
        const userMessage = event.message.text;

        logger.info(`Received message from user ${userId}: ${userMessage}`);

        // Detect intent
        const { intent } = this.detectIntent(userMessage);
        logger.info(`Detected intent: ${intent}`);

        // Handle intent and get responses
        const messages = await this.handleIntent(intent, userId, userMessage);

        // Reply to user
        if (messages.length > 0) {
          await this.client.replyMessage({
            replyToken: event.replyToken,
            messages: messages.slice(0, 5) as any, // LINE allows max 5 messages per reply
          });

          // If more than 5 messages, push the rest
          if (messages.length > 5) {
            await this.client.pushMessage({
              to: userId,
              messages: messages.slice(5) as any,
            });
          }
        }
      }
      // Handle follow events (new user)
      else if (event.type === 'follow') {
        const userId = event.source.userId || 'unknown';
        logger.info(`New follower: ${userId}`);

        await this.client.replyMessage({
          replyToken: event.replyToken,
          messages: [
            {
              type: 'text',
              text: '🎉 Welcome to Battery Management System!\n\n' +
                    'I\'m your intelligent assistant for monitoring battery systems.\n\n' +
                    'I can help you with:\n' +
                    '• Facility monitoring\n' +
                    '• Alert management\n' +
                    '• Battery predictions\n' +
                    '• System status\n\n' +
                    'Just ask me anything!',
              quickReply: richMessages.createQuickReply('main'),
            },
          ],
        });
      }
      // Handle unfollow events
      else if (event.type === 'unfollow') {
        const userId = event.source.userId || 'unknown';
        logger.info(`User unfollowed: ${userId}`);
        aiResponseService.clearContext(userId);
      }
      // Handle postback events (from buttons)
      else if (event.type === 'postback') {
        const userId = event.source.userId || 'unknown';
        const data = event.postback.data;
        logger.info(`Postback from user ${userId}: ${data}`);
        
        // Parse postback data and handle accordingly
        // Format: action=value (e.g., "facility_id=123")
        const params = new URLSearchParams(data);
        const action = params.get('action');
        
        if (action) {
          const messages = await this.handleIntent(action, userId, data);
          await this.client.replyMessage({
            replyToken: event.replyToken,
            messages: messages.slice(0, 5) as any,
          });
        }
      }
    } catch (error) {
      logger.error('Error handling Line event:', error);
      
      // Try to send error message to user
      if (event.type === 'message' && 'replyToken' in event) {
        try {
          await this.client.replyMessage({
            replyToken: event.replyToken,
            messages: [
              {
                type: 'text',
                text: 'I apologize, but I encountered an error. Please try again later.',
              },
            ],
          });
        } catch (replyError) {
          logger.error('Failed to send error message:', replyError);
        }
      }
    }
  }

  /**
   * Broadcast message to all users
   */
  async broadcast(message: string): Promise<void> {
    try {
      if (!this.channelAccessToken) {
        logger.warn('Line Channel Access Token missing, skipping broadcast.');
        return;
      }
      await this.client.broadcast({
        messages: [{ type: 'text', text: message }],
      });
      logger.info('Broadcast message sent successfully');
    } catch (error) {
      logger.error('Error broadcasting to Line:', error);
    }
  }

  /**
   * Send alert notification to specific user
   */
  async sendAlertNotification(userId: string, alert: {
    id: string;
    type: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    createdAt: string;
  }): Promise<void> {
    try {
      const alertCard = richMessages.createAlertCard({
        ...alert,
        status: 'active',
      });

      await this.client.pushMessage({
        to: userId,
        messages: [alertCard as any],
      });

      logger.info(`Alert notification sent to user ${userId}`);
    } catch (error) {
      logger.error(`Error sending alert notification to ${userId}:`, error);
    }
  }
}

export default new LineBotService();
