import { messagingApi, WebhookEvent } from '@line/bot-sdk';
import logger from '../config/logger.js';
import aiResponseService from './aiResponse.js';

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
    }

    async handleEvent(event: WebhookEvent): Promise<void> {
        if (event.type === 'message' && event.message.type === 'text') {
            try {
                const userMessage = event.message.text;
                const aiResponse = await aiResponseService.generateResponse(userMessage);

                await this.client.replyMessage({
                    replyToken: event.replyToken,
                    messages: [{ type: 'text', text: aiResponse }],
                });
            } catch (error) {
                logger.error('Error handling Line message event:', error);
            }
        } else if (event.type === 'follow') {
            logger.info(`New follower: ${event.source.userId}`);
        }
    }

    async broadcast(message: string): Promise<void> {
        try {
            if (!this.channelAccessToken) {
                logger.warn('Line Channel Access Token missing, skipping broadcast.');
                return;
            }
            await this.client.broadcast({
                messages: [{ type: 'text', text: message }]
            });
        } catch (error) {
            logger.error('Error broadcasting to Line:', error);
        }
    }
}

export default new LineBotService();
