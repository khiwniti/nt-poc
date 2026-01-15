# LINE Bot - Custom AI Provider Implementation Code

**Last Updated**: 2026-01-14  
**Purpose**: Complete code examples for implementing custom AI provider support

## Overview

This document contains all the TypeScript code needed to implement custom AI provider support in the LINE Bot service. Since Architect mode can only edit markdown files, this document serves as a reference for the actual implementation which will be done in Code mode.

## Table of Contents

1. [Type Definitions](#type-definitions)
2. [Provider Configuration](#provider-configuration)
3. [AI Response Service](#ai-response-service)
4. [Health Check Updates](#health-check-updates)
5. [Testing Updates](#testing-updates)

---

## Type Definitions

### File: `services/line-bot/src/types/ai.ts` (NEW FILE)

```typescript
/**
 * Supported AI provider types
 */
export type AIProvider = 
    | 'openai'
    | 'openrouter'
    | 'localai'
    | 'ollama'
    | 'azure'
    | 'custom';

/**
 * Complete AI provider configuration
 */
export interface AIProviderConfig {
    /** Provider type identifier */
    provider: AIProvider;
    
    /** Base URL for API requests */
    baseURL: string;
    
    /** API key for authentication (optional for some providers) */
    apiKey?: string;
    
    /** Model name to use for completions */
    model: string;
    
    /** Request timeout in milliseconds */
    timeout: number;
    
    /** Maximum number of retry attempts */
    maxRetries: number;
    
    /** Custom HTTP headers to include in requests */
    customHeaders?: Record<string, string>;
    
    /** Organization ID (OpenAI-specific) */
    organization?: string;
}

/**
 * Provider preset configuration template
 */
export interface AIProviderPreset {
    /** Default base URL for the provider */
    baseURL: string;
    
    /** Default model name */
    defaultModel: string;
    
    /** Whether authentication is required */
    requiresAuth: boolean;
    
    /** Default custom headers */
    customHeaders?: Record<string, string>;
}

/**
 * AI health check result
 */
export interface AIHealthStatus {
    /** Provider name */
    provider: AIProvider;
    
    /** Whether the provider is healthy */
    healthy: boolean;
    
    /** Current model being used */
    model: string;
    
    /** Optional error message if unhealthy */
    error?: string;
}
```

---

## Provider Configuration

### File: `services/line-bot/src/config/aiProvider.ts` (NEW FILE)

```typescript
import logger from './logger.js';
import { AIProviderConfig, AIProviderPreset, AIProvider } from '../types/ai.js';

/**
 * Built-in provider configuration presets
 */
const PROVIDER_PRESETS: Record<AIProvider, AIProviderPreset> = {
    openai: {
        baseURL: 'https://api.openai.com/v1',
        defaultModel: 'gpt-3.5-turbo',
        requiresAuth: true,
    },
    openrouter: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultModel: 'openai/gpt-3.5-turbo',
        requiresAuth: true,
        customHeaders: {
            'HTTP-Referer': process.env.APP_URL || 'http://localhost:3002',
            'X-Title': 'NT-POC LINE Bot',
        },
    },
    localai: {
        baseURL: process.env.AI_BASE_URL || 'http://localhost:8080/v1',
        defaultModel: 'gpt-3.5-turbo',
        requiresAuth: false,
    },
    ollama: {
        baseURL: process.env.AI_BASE_URL || 'http://localhost:11434/v1',
        defaultModel: 'llama2',
        requiresAuth: false,
    },
    azure: {
        baseURL: buildAzureBaseURL(),
        defaultModel: process.env.AI_MODEL || 'gpt-35-turbo',
        requiresAuth: true,
        customHeaders: {
            'api-key': process.env.AI_API_KEY || '',
        },
    },
    custom: {
        baseURL: process.env.AI_BASE_URL || '',
        defaultModel: process.env.AI_MODEL || 'gpt-3.5-turbo',
        requiresAuth: true,
    },
};

/**
 * Build Azure OpenAI base URL from environment variables
 */
function buildAzureBaseURL(): string {
    const resourceName = process.env.AZURE_OPENAI_RESOURCE_NAME;
    const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_ID;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
    
    if (!resourceName || !deploymentId) {
        return '';
    }
    
    return `https://${resourceName}.openai.azure.com/openai/deployments/${deploymentId}?api-version=${apiVersion}`;
}

/**
 * Parse custom headers from JSON string
 */
function parseCustomHeaders(headersJson?: string): Record<string, string> {
    if (!headersJson) {
        return {};
    }
    
    try {
        const parsed = JSON.parse(headersJson);
        if (typeof parsed !== 'object' || parsed === null) {
            logger.warn('AI_CUSTOM_HEADERS is not a valid object, ignoring');
            return {};
        }
        return parsed;
    } catch (error) {
        logger.warn('Failed to parse AI_CUSTOM_HEADERS as JSON, ignoring', { error });
        return {};
    }
}

/**
 * Validate required environment variables for the selected provider
 */
function validateProviderConfig(provider: AIProvider, preset: AIProviderPreset): void {
    // Check if API key is required and missing
    if (preset.requiresAuth && !process.env.AI_API_KEY) {
        throw new Error(
            `AI_API_KEY is required for provider '${provider}'. ` +
            `Please set it in your .env file.`
        );
    }
    
    // Check if base URL is required and missing
    if (provider === 'custom' && !process.env.AI_BASE_URL) {
        throw new Error(
            `AI_BASE_URL is required when using custom provider. ` +
            `Please set it in your .env file.`
        );
    }
    
    // Azure-specific validation
    if (provider === 'azure') {
        if (!process.env.AZURE_OPENAI_RESOURCE_NAME) {
            throw new Error(
                'AZURE_OPENAI_RESOURCE_NAME is required for Azure OpenAI provider'
            );
        }
        if (!process.env.AZURE_OPENAI_DEPLOYMENT_ID) {
            throw new Error(
                'AZURE_OPENAI_DEPLOYMENT_ID is required for Azure OpenAI provider'
            );
        }
    }
}

/**
 * Get the complete AI provider configuration
 * @returns Fully configured AI provider settings
 * @throws Error if configuration is invalid
 */
export function getAIProviderConfig(): AIProviderConfig {
    // Get provider from environment or default to OpenAI
    const provider = (process.env.AI_PROVIDER || 'openai') as AIProvider;
    
    // Get preset configuration
    const preset = PROVIDER_PRESETS[provider];
    
    if (!preset) {
        throw new Error(
            `Unknown AI provider: '${provider}'. ` +
            `Valid options are: ${Object.keys(PROVIDER_PRESETS).join(', ')}`
        );
    }
    
    // Validate configuration
    validateProviderConfig(provider, preset);
    
    // Build final configuration
    const config: AIProviderConfig = {
        provider,
        baseURL: process.env.AI_BASE_URL || preset.baseURL,
        apiKey: process.env.AI_API_KEY,
        model: process.env.AI_MODEL || preset.defaultModel,
        timeout: parseInt(process.env.AI_REQUEST_TIMEOUT || '30000', 10),
        maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3', 10),
        customHeaders: {
            ...preset.customHeaders,
            ...parseCustomHeaders(process.env.AI_CUSTOM_HEADERS),
        },
        organization: process.env.AI_ORGANIZATION_ID,
    };
    
    // Log configuration (without sensitive data)
    logger.info('AI provider configuration loaded', {
        provider: config.provider,
        baseURL: config.baseURL,
        model: config.model,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
        hasApiKey: !!config.apiKey,
        hasOrganization: !!config.organization,
    });
    
    return config;
}

/**
 * Backward compatibility: Support legacy OPENAI_* environment variables
 */
export function migrateLegacyConfig(): void {
    // If new AI_PROVIDER is not set but legacy OPENAI_API_KEY exists
    if (!process.env.AI_PROVIDER && process.env.OPENAI_API_KEY) {
        logger.warn(
            'Using legacy OPENAI_API_KEY environment variable. ' +
            'Please migrate to AI_PROVIDER=openai and AI_API_KEY for future compatibility.'
        );
        
        process.env.AI_PROVIDER = 'openai';
        process.env.AI_API_KEY = process.env.OPENAI_API_KEY;
        
        if (process.env.OPENAI_MODEL) {
            process.env.AI_MODEL = process.env.OPENAI_MODEL;
        }
    }
}
```

---

## AI Response Service

### File: `services/line-bot/src/services/aiResponse.ts` (REPLACE ENTIRE FILE)

```typescript
import OpenAI from 'openai';
import logger from '../config/logger.js';
import { getAIProviderConfig, migrateLegacyConfig } from '../config/aiProvider.js';
import { AIProviderConfig, AIHealthStatus } from '../types/ai.js';

/**
 * AI Response Service
 * 
 * Handles AI-powered responses using configurable providers.
 * Supports OpenAI, OpenRouter, LocalAI, Ollama, Azure OpenAI, and custom providers.
 */
export class AIResponseService {
    private client: OpenAI;
    private config: AIProviderConfig;
    private systemPrompt: string;

    constructor() {
        // Support legacy environment variables
        migrateLegacyConfig();
        
        // Load provider configuration
        this.config = getAIProviderConfig();
        
        // Initialize OpenAI client with custom configuration
        this.client = new OpenAI({
            apiKey: this.config.apiKey || 'not-required',
            baseURL: this.config.baseURL,
            timeout: this.config.timeout,
            maxRetries: this.config.maxRetries,
            organization: this.config.organization,
            defaultHeaders: this.config.customHeaders,
        });
        
        // Define system prompt for the assistant
        this.systemPrompt = `You are a helpful assistant for the NT-POC Battery Management System. 
You have access to information about battery systems, facilities, and alerts. 
When asked about status, provide a clear and concise summary. 
When asked about alerts, explain the severity and implications.
Keep your responses concise and suitable for a chat interface like LINE (aim for 2-3 sentences unless more detail is requested).
Use simple language and avoid technical jargon when possible.`;
        
        logger.info('AI Response Service initialized', {
            provider: this.config.provider,
            model: this.config.model,
            baseURL: this.config.baseURL,
        });
    }

    /**
     * Generate an AI response based on user message and optional context
     * 
     * @param userMessage - The message from the user
     * @param context - Optional system context (battery stats, alerts, etc.)
     * @returns AI-generated response text
     */
    async generateResponse(userMessage: string, context?: any): Promise<string> {
        try {
            // Build context string if provided
            let runContext = '';
            if (context) {
                runContext = `Current System Context: ${JSON.stringify(context, null, 2)}`;
            }

            // Create chat completion
            const startTime = Date.now();
            const completion = await this.client.chat.completions.create({
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    ...(runContext ? [{ role: 'system', content: runContext }] : []),
                    { role: 'user', content: userMessage },
                ],
                model: this.config.model,
                temperature: 0.7,
                max_tokens: 500, // Suitable for LINE messages (shorter responses)
                top_p: 0.9,
            });
            
            const duration = Date.now() - startTime;

            // Extract response
            const response = completion.choices[0]?.message?.content || 
                'I apologize, but I could not generate a response at this time.';
            
            // Log successful response
            logger.debug('AI response generated', {
                provider: this.config.provider,
                model: this.config.model,
                messageLength: response.length,
                durationMs: duration,
                tokensUsed: completion.usage?.total_tokens,
            });
            
            return response;
            
        } catch (error) {
            logger.error('Error generating AI response', {
                provider: this.config.provider,
                model: this.config.model,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            
            return this.getErrorMessage(error);
        }
    }
    
    /**
     * Get user-friendly error message based on error type
     */
    private getErrorMessage(error: any): string {
        // Authentication errors
        if (error?.status === 401 || error?.code === 'invalid_api_key') {
            logger.error('Authentication failed - check AI_API_KEY');
            return 'Authentication failed. Please contact the system administrator.';
        }
        
        // Rate limit errors
        if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
            logger.warn('Rate limit exceeded');
            return 'The AI service is currently experiencing high demand. Please try again in a moment.';
        }
        
        // Service unavailable
        if (error?.status === 503 || error?.code === 'service_unavailable') {
            logger.error('AI service unavailable');
            return 'The AI service is temporarily unavailable. Please try again later.';
        }
        
        // Model not found
        if (error?.status === 404 || error?.code === 'model_not_found') {
            logger.error('AI model not found', { model: this.config.model });
            return 'AI configuration error. Please contact the system administrator.';
        }
        
        // Connection errors
        if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
            logger.error('Cannot connect to AI provider', { 
                baseURL: this.config.baseURL,
                code: error.code,
            });
            return 'Cannot connect to AI service. Please contact the system administrator.';
        }
        
        // Generic error
        return 'I encountered an error while processing your request. Please try again later.';
    }
    
    /**
     * Health check for AI provider
     * 
     * @returns Health status including provider info and connectivity
     */
    async healthCheck(): Promise<AIHealthStatus> {
        try {
            // Send a minimal test request
            const completion = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: 'ping' }],
                model: this.config.model,
                max_tokens: 5,
            });
            
            const healthy = completion.choices.length > 0;
            
            logger.debug('AI provider health check', {
                provider: this.config.provider,
                healthy,
            });
            
            return {
                provider: this.config.provider,
                healthy,
                model: this.config.model,
            };
            
        } catch (error) {
            logger.error('AI provider health check failed', {
                provider: this.config.provider,
                error: error instanceof Error ? error.message : String(error),
            });
            
            return {
                provider: this.config.provider,
                healthy: false,
                model: this.config.model,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    
    /**
     * Get current provider configuration (for monitoring/debugging)
     */
    getProviderInfo(): { provider: string; model: string; baseURL: string } {
        return {
            provider: this.config.provider,
            model: this.config.model,
            baseURL: this.config.baseURL,
        };
    }
}

// Export singleton instance
export default new AIResponseService();
```

---

## Health Check Updates

### File: `services/line-bot/src/routes/health.ts` (MODIFY)

Replace the entire file with:

```typescript
import express from 'express';
import aiService from '../services/aiResponse.js';

const router = express.Router();

/**
 * Health check endpoint
 * 
 * Returns service status and AI provider health
 */
router.get('/', async (req, res) => {
    try {
        // Get AI provider health
        const aiHealth = await aiService.healthCheck();
        const providerInfo = aiService.getProviderInfo();
        
        // Build response
        const response = {
            status: 'ok',
            service: 'line-bot',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            ai: {
                provider: providerInfo.provider,
                model: providerInfo.model,
                healthy: aiHealth.healthy,
                ...(aiHealth.error && { error: aiHealth.error }),
            },
        };
        
        // Return 503 if AI is unhealthy (but service is still running)
        const statusCode = aiHealth.healthy ? 200 : 503;
        
        res.status(statusCode).json(response);
        
    } catch (error) {
        // Service health check itself failed
        res.status(500).json({
            status: 'error',
            service: 'line-bot',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
        });
    }
});

export default router;
```

---

## Testing Updates

### File: `services/line-bot/test-local.sh` (ADD TO EXISTING FILE)

Add these test functions to the existing test script:

```bash
#!/bin/bash

# ... (existing code) ...

# Color codes (existing)
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ... (existing variables and functions) ...

#==============================================================================
# AI Provider Tests
#==============================================================================

test_ai_provider_config() {
    echo -e "${BLUE}Testing AI Provider Configuration...${NC}"
    
    # Check environment variables
    local provider="${AI_PROVIDER:-openai}"
    echo "  Provider: $provider"
    echo "  Model: ${AI_MODEL:-gpt-3.5-turbo}"
    
    if [ -n "$AI_BASE_URL" ]; then
        echo "  Base URL: $AI_BASE_URL"
    fi
    
    echo -e "${GREEN}✓ Configuration displayed${NC}"
}

test_ai_health_check() {
    echo -e "${BLUE}Testing AI Provider Health Check...${NC}"
    
    # Call health endpoint
    response=$(curl -s "$BASE_URL/health")
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Failed to connect to health endpoint${NC}"
        return 1
    fi
    
    # Extract AI health status
    ai_healthy=$(echo "$response" | jq -r '.ai.healthy')
    ai_provider=$(echo "$response" | jq -r '.ai.provider')
    ai_model=$(echo "$response" | jq -r '.ai.model')
    
    echo "  Provider: $ai_provider"
    echo "  Model: $ai_model"
    echo "  Healthy: $ai_healthy"
    
    if [ "$ai_healthy" == "true" ]; then
        echo -e "${GREEN}✓ AI provider is healthy${NC}"
        return 0
    else
        ai_error=$(echo "$response" | jq -r '.ai.error // "Unknown error"')
        echo -e "${YELLOW}⚠ AI provider health check failed: $ai_error${NC}"
        echo -e "${YELLOW}  Service is running but AI responses may not work${NC}"
        return 1
    fi
}

test_ai_response_generation() {
    echo -e "${BLUE}Testing AI Response Generation...${NC}"
    
    if [ -z "$API_SECRET_KEY" ]; then
        echo -e "${YELLOW}⚠ Skipping - API_SECRET_KEY not set${NC}"
        return 0
    fi
    
    # Test message
    test_message="Hello, what is the battery status?"
    
    echo "  Sending test message: \"$test_message\""
    
    # Send via notify endpoint (for testing)
    start_time=$(date +%s%3N)
    response=$(curl -s -X POST "$BASE_URL/notify" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_SECRET_KEY" \
        -d "{\"message\": \"$test_message\"}")
    end_time=$(date +%s%3N)
    duration=$((end_time - start_time))
    
    if [ $? -eq 0 ]; then
        echo "  Response time: ${duration}ms"
        echo -e "${GREEN}✓ AI response generated successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to generate AI response${NC}"
        echo "  Response: $response"
        return 1
    fi
}

test_ai_provider_compatibility() {
    echo -e "${BLUE}Testing Provider-Specific Features...${NC}"
    
    local provider="${AI_PROVIDER:-openai}"
    
    case "$provider" in
        openai)
            echo "  Testing OpenAI-specific features..."
            # OpenAI uses standard endpoints
            echo -e "${GREEN}✓ Using OpenAI standard configuration${NC}"
            ;;
        openrouter)
            echo "  Testing OpenRouter-specific features..."
            # Check if custom headers are set
            if [ -n "$AI_CUSTOM_HEADERS" ]; then
                echo -e "${GREEN}✓ Custom headers configured${NC}"
            else
                echo -e "${YELLOW}⚠ AI_CUSTOM_HEADERS not set (recommended for better rate limits)${NC}"
            fi
            ;;
        localai|ollama)
            echo "  Testing local provider connectivity..."
            # Check if local service is accessible
            local base_url="${AI_BASE_URL}"
            if [ -n "$base_url" ]; then
                # Extract host and port
                local check_url=$(echo "$base_url" | sed 's|/v1$||')
                if curl -s -f -o /dev/null "$check_url/models" 2>/dev/null; then
                    echo -e "${GREEN}✓ Local AI service is accessible${NC}"
                else
                    echo -e "${YELLOW}⚠ Cannot reach local AI service at $base_url${NC}"
                fi
            fi
            ;;
        azure)
            echo "  Testing Azure OpenAI configuration..."
            if [ -n "$AZURE_OPENAI_RESOURCE_NAME" ] && [ -n "$AZURE_OPENAI_DEPLOYMENT_ID" ]; then
                echo -e "${GREEN}✓ Azure configuration looks correct${NC}"
            else
                echo -e "${YELLOW}⚠ Azure configuration may be incomplete${NC}"
            fi
            ;;
        custom)
            echo "  Testing custom provider..."
            if [ -n "$AI_BASE_URL" ]; then
                echo -e "${GREEN}✓ Custom base URL configured${NC}"
            else
                echo -e "${RED}✗ AI_BASE_URL required for custom provider${NC}"
                return 1
            fi
            ;;
    esac
    
    return 0
}

#==============================================================================
# Main Test Suite (add to existing)
#==============================================================================

echo ""
echo "========================================="
echo "AI Provider Tests"
echo "========================================="

test_ai_provider_config
test_ai_health_check
test_ai_response_generation
test_ai_provider_compatibility

# ... (rest of existing test suite) ...
```

---

## Unit Tests

### File: `services/line-bot/src/__tests__/aiProvider.test.ts` (NEW FILE)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAIProviderConfig, migrateLegacyConfig } from '../config/aiProvider.js';

describe('AI Provider Configuration', () => {
    beforeEach(() => {
        // Clear environment before each test
        delete process.env.AI_PROVIDER;
        delete process.env.AI_API_KEY;
        delete process.env.AI_MODEL;
        delete process.env.AI_BASE_URL;
        delete process.env.OPENAI_API_KEY;
        delete process.env.OPENAI_MODEL;
    });

    it('should default to OpenAI provider', () => {
        process.env.AI_API_KEY = 'test-key';
        
        const config = getAIProviderConfig();
        
        expect(config.provider).toBe('openai');
        expect(config.baseURL).toBe('https://api.openai.com/v1');
        expect(config.model).toBe('gpt-3.5-turbo');
    });

    it('should configure OpenRouter provider', () => {
        process.env.AI_PROVIDER = 'openrouter';
        process.env.AI_API_KEY = 'sk-or-v1-test';
        
        const config = getAIProviderConfig();
        
        expect(config.provider).toBe('openrouter');
        expect(config.baseURL).toBe('https://openrouter.ai/api/v1');
        expect(config.model).toBe('openai/gpt-3.5-turbo');
    });

    it('should configure LocalAI provider', () => {
        process.env.AI_PROVIDER = 'localai';
        process.env.AI_BASE_URL = 'http://localhost:8080/v1';
        
        const config = getAIProviderConfig();
        
        expect(config.provider).toBe('localai');
        expect(config.baseURL).toBe('http://localhost:8080/v1');
    });

    it('should throw error for missing API key when required', () => {
        process.env.AI_PROVIDER = 'openai';
        // No API_API_KEY set
        
        expect(() => getAIProviderConfig()).toThrow('AI_API_KEY is required');
    });

    it('should migrate legacy OpenAI config', () => {
        process.env.OPENAI_API_KEY = 'sk-legacy-key';
        process.env.OPENAI_MODEL = 'gpt-4';
        
        migrateLegacyConfig();
        
        expect(process.env.AI_PROVIDER).toBe('openai');
        expect(process.env.AI_API_KEY).toBe('sk-legacy-key');
        expect(process.env.AI_MODEL).toBe('gpt-4');
    });

    it('should parse custom headers from JSON', () => {
        process.env.AI_PROVIDER = 'openrouter';
        process.env.AI_API_KEY = 'test-key';
        process.env.AI_CUSTOM_HEADERS = '{"X-Custom":"value"}';
        
        const config = getAIProviderConfig();
        
        expect(config.customHeaders).toHaveProperty('X-Custom', 'value');
    });
});
```

---

## Next Steps for Implementation

Since Architect mode cannot create/modify TypeScript files, the actual implementation requires switching to **Code mode**. Here's the implementation checklist:

### Files to Create

1. ✅ **`services/line-bot/src/types/ai.ts`**
   - Copy type definitions from this document

2. ✅ **`services/line-bot/src/config/aiProvider.ts`**
   - Copy provider configuration code

3. ✅ **`services/line-bot/src/__tests__/aiProvider.test.ts`**
   - Copy unit tests

### Files to Modify

1. ✅ **`services/line-bot/src/services/aiResponse.ts`**
   - Replace entire file with new implementation

2. ✅ **`services/line-bot/src/routes/health.ts`**
   - Update to include AI health check

3. ✅ **`services/line-bot/.env.example`**
   - Add new AI_* environment variables (see [`plans/LINE_BOT_ENV_CONFIGURATION.md`](./LINE_BOT_ENV_CONFIGURATION.md))

4. ✅ **`services/line-bot/test-local.sh`**
   - Add AI provider test functions

### Testing Checklist

After implementation:

- [ ] Run `npm install` (no new dependencies needed)
- [ ] Run `npm run typecheck` (verify TypeScript compiles)
- [ ] Run `npm test` (run unit tests)
- [ ] Test with OpenAI (default)
- [ ] Test with OpenRouter
- [ ] Test with local provider (Ollama or LocalAI)
- [ ] Test health endpoint
- [ ] Test error handling
- [ ] Update documentation if needed

### Deployment Considerations

- Add new environment variables to deployment platform (Railway, etc.)
- Update deployment documentation with provider options
- Consider default provider for production
- Set up monitoring for AI provider health

---

## Related Documentation

- **Main Plan**: [`plans/LINE_BOT_CUSTOM_AI_PROVIDER.md`](./LINE_BOT_CUSTOM_AI_PROVIDER.md) - Complete implementation plan and provider guides
- **Environment Config**: [`plans/LINE_BOT_ENV_CONFIGURATION.md`](./LINE_BOT_ENV_CONFIGURATION.md) - Updated `.env.example` content
- **Original Setup**: [`plans/LINE_BOT_LOCAL_DEV_SETUP.md`](./LINE_BOT_LOCAL_DEV_SETUP.md) - Original local development guide
