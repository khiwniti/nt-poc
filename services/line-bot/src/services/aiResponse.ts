import OpenAI from 'openai';
import logger from '../config/logger.js';

export class AIResponseService {
    private openai: OpenAI;
    private systemPrompt: string;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-for-local',
            baseURL: process.env.AI_BASE_URL || undefined,
        });
        this.systemPrompt = `You are a helpful assistant for the Ottawa monitoring system. 
    You have access to the current status of the battery systems and alerts. 
    When asked about status, provide a summary. 
    When asked about alerts, explain the severity and implications.
    Keep your responses concise and suitable for a chat interface like Line.`;
    }

    async generateResponse(userMessage: string, context?: any): Promise<string> {
        try {
            let runContext = '';
            if (context) {
                runContext = `Current System Context: ${JSON.stringify(context)}`;
            }

            const completion = await this.openai.chat.completions.create({
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'system', content: runContext },
                    { role: 'user', content: userMessage },
                ],
                model: process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            });

            return completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response at this time.';
        } catch (error) {
            logger.error('Error generating AI response:', error);
            return 'I encountered an error while processing your request. Please try again later.';
        }
    }
}

export default new AIResponseService();
