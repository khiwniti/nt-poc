# LINE Bot - Custom AI Provider Configuration

**Last Updated**: 2026-01-14  
**Status**: Architecture & Implementation Plan

## Overview

This document provides a comprehensive guide for configuring the LINE Bot to use OpenAI-compatible AI providers with custom base URLs instead of the default OpenAI API. This enables flexibility to use various AI providers including OpenRouter, LocalAI, Ollama, Azure OpenAI, and self-hosted models.

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Supported AI Providers](#supported-ai-providers)
3. [Configuration Design](#configuration-design)
4. [Implementation Plan](#implementation-plan)
5. [Provider-Specific Setup Guides](#provider-specific-setup-guides)
6. [Testing & Validation](#testing--validation)
7. [Migration Guide](#migration-guide)
8. [Troubleshooting](#troubleshooting)

---

## Current Architecture Analysis

### Existing Implementation

**File**: [`services/line-bot/src/services/aiResponse.ts`](../services/line-bot/src/services/aiResponse.ts)

```typescript
import OpenAI from 'openai';

export class AIResponseService {
    private openai: OpenAI;
    
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    
    async generateResponse(userMessage: string, context?: any): Promise<string> {
        const completion = await this.openai.chat.completions.create({
            messages: [...],
            model: 'gpt-3.5-turbo',
        });
        return completion.choices[0]?.message?.content || '...';
    }
}
```

### Current Limitations

- ✗ Hardcoded to OpenAI's default base URL
- ✗ No support for custom endpoints
- ✗ Model name hardcoded to `gpt-3.5-turbo`
- ✗ No provider-specific configuration options
- ✗ Limited error handling for different providers

### OpenAI SDK Capabilities

The [`openai`](https://www.npmjs.com/package/openai) package (v6.16.0) already supports custom base URLs through the `baseURL` parameter:

```typescript
const openai = new OpenAI({
    apiKey: process.env.API_KEY,
    baseURL: 'https://custom-endpoint.com/v1',
});
```

**Key Features**:
- ✓ Drop-in replacement for OpenAI API
- ✓ Works with any OpenAI-compatible API
- ✓ Supports custom headers and authentication
- ✓ Maintains the same interface for chat completions

---

## Supported AI Providers

### 1. OpenRouter

**Use Case**: Access multiple AI models (GPT-4, Claude, Gemini, etc.) through a single API

**Features**:
- 200+ models from different providers
- Unified billing and API
- Automatic fallback and load balancing
- Cost optimization

**Base URL**: `https://openrouter.ai/api/v1`

**Models Available**:
- `openai/gpt-4-turbo-preview`
- `openai/gpt-3.5-turbo`
- `anthropic/claude-3-opus`
- `anthropic/claude-3-sonnet`
- `google/gemini-pro`
- `meta-llama/llama-3-70b-instruct`
- And 200+ more...

### 2. LocalAI

**Use Case**: Self-hosted, privacy-focused AI with local models

**Features**:
- Runs entirely on your infrastructure
- No data sent to external services
- Supports GGML/GGUF models
- GPU acceleration support

**Base URL**: `http://localhost:8080/v1` (default)

**Models Available**:
- `gpt-3.5-turbo` (mapped to local model)
- `llama-2-7b-chat`
- `mistral-7b-instruct`
- Custom model aliases

### 3. Ollama

**Use Case**: Easy local model deployment with Docker

**Features**:
- Simple installation and management
- Automatic model downloads
- REST API compatible with OpenAI
- Resource-efficient

**Base URL**: `http://localhost:11434/v1`

**Models Available**:
- `llama2`
- `mistral`
- `codellama`
- `phi`
- `gemma`

### 4. Azure OpenAI Service

**Use Case**: Enterprise-grade OpenAI models with Azure integration

**Features**:
- Enterprise SLAs and compliance
- Azure AD authentication
- Virtual network integration
- Regional deployment

**Base URL**: `https://{resource-name}.openai.azure.com/openai/deployments/{deployment-id}`

**Models Available**:
- `gpt-4`
- `gpt-3.5-turbo`
- `text-embedding-ada-002`

### 5. Together AI

**Use Case**: Fast inference for open-source models

**Features**:
- High-performance inference
- Competitive pricing
- Multiple open-source models
- OpenAI-compatible API

**Base URL**: `https://api.together.xyz/v1`

### 6. Hugging Face Inference API

**Use Case**: Access thousands of models from Hugging Face

**Features**:
- Largest model repository
- Easy model deployment
- Free tier available
- Custom model support

**Base URL**: Custom per model deployment

### 7. Self-Hosted Models

**Use Case**: Complete control over AI infrastructure

**Options**:
- **vLLM**: High-throughput inference server
- **Text Generation Inference (TGI)**: Hugging Face's production inference
- **FastChat**: OpenAI-compatible API for various models
- **LM Studio**: Desktop application for local models

---

## Configuration Design

### Environment Variables

**New Variables** (add to [`.env.example`](../services/line-bot/.env.example)):

```bash
# AI Provider Configuration
# Options: 'openai', 'openrouter', 'localai', 'ollama', 'azure', 'custom'
AI_PROVIDER=openai

# Custom Base URL (required if AI_PROVIDER='custom' or for specific providers)
AI_BASE_URL=

# API Key (provider-specific)
AI_API_KEY=

# Model Name (provider-specific, defaults shown)
AI_MODEL=gpt-3.5-turbo

# Optional: Additional headers for specific providers (JSON format)
AI_CUSTOM_HEADERS=

# Optional: Request timeout in milliseconds
AI_REQUEST_TIMEOUT=30000

# Optional: Max retries for failed requests
AI_MAX_RETRIES=3

# Optional: Organization ID (for OpenAI/Azure)
AI_ORGANIZATION_ID=

# Azure-specific (when AI_PROVIDER='azure')
AZURE_OPENAI_RESOURCE_NAME=
AZURE_OPENAI_DEPLOYMENT_ID=
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### Provider Presets

**Built-in Configurations**:

```typescript
const PROVIDER_PRESETS = {
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
        baseURL: `https://${process.env.AZURE_OPENAI_RESOURCE_NAME}.openai.azure.com/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_ID}`,
        defaultModel: process.env.AI_MODEL || 'gpt-35-turbo',
        requiresAuth: true,
        customHeaders: {
            'api-key': process.env.AI_API_KEY,
        },
    },
    custom: {
        baseURL: process.env.AI_BASE_URL,
        defaultModel: process.env.AI_MODEL || 'gpt-3.5-turbo',
        requiresAuth: true,
    },
};
```

---

## Implementation Plan

### Phase 1: Configuration Layer

**File**: `services/line-bot/src/config/aiProvider.ts` (NEW)

```typescript
import { AIProviderConfig } from '../types/ai.js';

export function getAIProviderConfig(): AIProviderConfig {
    const provider = process.env.AI_PROVIDER || 'openai';
    const preset = PROVIDER_PRESETS[provider];
    
    if (!preset) {
        throw new Error(`Unknown AI provider: ${provider}`);
    }
    
    // Validate required environment variables
    if (preset.requiresAuth && !process.env.AI_API_KEY) {
        throw new Error(`AI_API_KEY is required for provider: ${provider}`);
    }
    
    // Build configuration
    return {
        provider,
        baseURL: process.env.AI_BASE_URL || preset.baseURL,
        apiKey: process.env.AI_API_KEY,
        model: process.env.AI_MODEL || preset.defaultModel,
        timeout: parseInt(process.env.AI_REQUEST_TIMEOUT || '30000'),
        maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3'),
        customHeaders: {
            ...preset.customHeaders,
            ...parseCustomHeaders(process.env.AI_CUSTOM_HEADERS),
        },
        organization: process.env.AI_ORGANIZATION_ID,
    };
}

function parseCustomHeaders(headersJson?: string): Record<string, string> {
    if (!headersJson) return {};
    try {
        return JSON.parse(headersJson);
    } catch (error) {
        logger.warn('Failed to parse AI_CUSTOM_HEADERS, ignoring');
        return {};
    }
}
```

### Phase 2: Update AIResponseService

**File**: [`services/line-bot/src/services/aiResponse.ts`](../services/line-bot/src/services/aiResponse.ts) (MODIFY)

```typescript
import OpenAI from 'openai';
import logger from '../config/logger.js';
import { getAIProviderConfig } from '../config/aiProvider.js';

export class AIResponseService {
    private client: OpenAI;
    private config: AIProviderConfig;
    private systemPrompt: string;

    constructor() {
        this.config = getAIProviderConfig();
        
        // Initialize OpenAI client with custom configuration
        this.client = new OpenAI({
            apiKey: this.config.apiKey,
            baseURL: this.config.baseURL,
            timeout: this.config.timeout,
            maxRetries: this.config.maxRetries,
            organization: this.config.organization,
            defaultHeaders: this.config.customHeaders,
        });
        
        this.systemPrompt = `You are a helpful assistant for the Ottawa monitoring system. 
    You have access to the current status of the battery systems and alerts. 
    When asked about status, provide a summary. 
    When asked about alerts, explain the severity and implications.
    Keep your responses concise and suitable for a chat interface like Line.`;
        
        logger.info('AI Provider initialized', {
            provider: this.config.provider,
            model: this.config.model,
            baseURL: this.config.baseURL,
        });
    }

    async generateResponse(userMessage: string, context?: any): Promise<string> {
        try {
            let runContext = '';
            if (context) {
                runContext = `Current System Context: ${JSON.stringify(context)}`;
            }

            const completion = await this.client.chat.completions.create({
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'system', content: runContext },
                    { role: 'user', content: userMessage },
                ],
                model: this.config.model,
                temperature: 0.7,
                max_tokens: 500, // Suitable for LINE messages
            });

            const response = completion.choices[0]?.message?.content || 
                'I apologize, but I could not generate a response at this time.';
            
            logger.debug('AI response generated', {
                provider: this.config.provider,
                model: this.config.model,
                messageLength: response.length,
            });
            
            return response;
        } catch (error) {
            logger.error('Error generating AI response:', {
                provider: this.config.provider,
                error: error instanceof Error ? error.message : String(error),
            });
            
            return this.getErrorMessage(error);
        }
    }
    
    private getErrorMessage(error: any): string {
        // Provider-specific error handling
        if (error?.status === 401) {
            return 'Authentication failed. Please check API credentials.';
        }
        if (error?.status === 429) {
            return 'Rate limit exceeded. Please try again in a moment.';
        }
        if (error?.status === 503) {
            return 'AI service is temporarily unavailable. Please try again later.';
        }
        
        return 'I encountered an error while processing your request. Please try again later.';
    }
    
    // Health check method for monitoring
    async healthCheck(): Promise<boolean> {
        try {
            const completion = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: 'ping' }],
                model: this.config.model,
                max_tokens: 5,
            });
            return completion.choices.length > 0;
        } catch (error) {
            logger.error('AI provider health check failed:', error);
            return false;
        }
    }
}

export default new AIResponseService();
```

### Phase 3: Type Definitions

**File**: `services/line-bot/src/types/ai.ts` (NEW)

```typescript
export type AIProvider = 
    | 'openai'
    | 'openrouter'
    | 'localai'
    | 'ollama'
    | 'azure'
    | 'custom';

export interface AIProviderConfig {
    provider: AIProvider;
    baseURL: string;
    apiKey?: string;
    model: string;
    timeout: number;
    maxRetries: number;
    customHeaders?: Record<string, string>;
    organization?: string;
}

export interface AIProviderPreset {
    baseURL: string;
    defaultModel: string;
    requiresAuth: boolean;
    customHeaders?: Record<string, string>;
}
```

### Phase 4: Health Check Integration

**File**: [`services/line-bot/src/routes/health.ts`](../services/line-bot/src/routes/health.ts) (MODIFY)

```typescript
import express from 'express';
import aiService from '../services/aiResponse.js';

const router = express.Router();

router.get('/', async (req, res) => {
    const aiHealthy = await aiService.healthCheck();
    
    res.json({
        status: 'ok',
        service: 'line-bot',
        timestamp: new Date().toISOString(),
        ai: {
            provider: process.env.AI_PROVIDER || 'openai',
            healthy: aiHealthy,
        },
    });
});

export default router;
```

---

## Provider-Specific Setup Guides

### OpenRouter Setup

**1. Create Account**: Visit [openrouter.ai](https://openrouter.ai)

**2. Get API Key**: Navigate to Keys section

**3. Configure Environment**:

```bash
AI_PROVIDER=openrouter
AI_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AI_MODEL=openai/gpt-3.5-turbo
# Optional: For better rate limits, add your site URL
APP_URL=https://your-line-bot-domain.com
```

**4. Model Selection**:

```bash
# Fast & Cheap
AI_MODEL=openai/gpt-3.5-turbo

# High Quality
AI_MODEL=anthropic/claude-3-opus
AI_MODEL=openai/gpt-4-turbo-preview

# Open Source
AI_MODEL=meta-llama/llama-3-70b-instruct
AI_MODEL=mistralai/mixtral-8x7b-instruct
```

**5. Cost Optimization**:

OpenRouter shows cost per request in response headers. Monitor usage:

```bash
# Add to custom headers for tracking
AI_CUSTOM_HEADERS='{"X-Title":"NT-POC LINE Bot"}'
```

### LocalAI Setup

**1. Install with Docker**:

```bash
docker run -d \
  --name localai \
  -p 8080:8080 \
  -v $PWD/models:/models \
  localai/localai:latest
```

**2. Download Model**:

```bash
# Download a model (example: Mistral 7B)
curl -L https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf \
  -o models/mistral-7b-instruct.gguf
```

**3. Create Model Configuration**:

**File**: `models/gpt-3.5-turbo.yaml`

```yaml
name: gpt-3.5-turbo
backend: llama
parameters:
  model: mistral-7b-instruct.gguf
  temperature: 0.7
  top_k: 40
  top_p: 0.95
  max_tokens: 500
context_size: 4096
threads: 4
```

**4. Configure Environment**:

```bash
AI_PROVIDER=localai
AI_BASE_URL=http://localhost:8080/v1
AI_MODEL=gpt-3.5-turbo
AI_API_KEY=not-required
```

**5. Verify Installation**:

```bash
curl http://localhost:8080/v1/models
```

### Ollama Setup

**1. Install Ollama**:

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Or via Docker
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

**2. Pull Model**:

```bash
ollama pull llama2
# or
ollama pull mistral
ollama pull phi
```

**3. Configure Environment**:

```bash
AI_PROVIDER=ollama
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama2
AI_API_KEY=not-required
```

**4. Test Ollama**:

```bash
ollama run llama2 "Hello, how are you?"
```

### Azure OpenAI Setup

**1. Create Azure OpenAI Resource**: Via Azure Portal

**2. Deploy Model**: Create a deployment (e.g., `gpt-35-turbo`)

**3. Get Credentials**:
- Resource name: From Azure Portal
- API key: From "Keys and Endpoint" section
- Deployment ID: Name of your deployment

**4. Configure Environment**:

```bash
AI_PROVIDER=azure
AZURE_OPENAI_RESOURCE_NAME=your-resource-name
AZURE_OPENAI_DEPLOYMENT_ID=gpt-35-turbo
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AI_API_KEY=your-azure-api-key
AI_MODEL=gpt-35-turbo
```

### Custom Provider Setup

**Example**: Using a self-hosted vLLM server

**1. Start vLLM Server**:

```bash
python -m vllm.entrypoints.openai.api_server \
  --model mistralai/Mistral-7B-Instruct-v0.2 \
  --port 8000
```

**2. Configure Environment**:

```bash
AI_PROVIDER=custom
AI_BASE_URL=http://localhost:8000/v1
AI_MODEL=mistralai/Mistral-7B-Instruct-v0.2
AI_API_KEY=not-required
```

---

## Testing & Validation

### Test Script Updates

**File**: `services/line-bot/test-local.sh` (ADD SECTION)

```bash
#!/bin/bash

# Test AI Provider Configuration
test_ai_provider() {
    echo -e "${BLUE}Testing AI Provider Configuration...${NC}"
    
    # Check if AI provider is configured
    local provider="${AI_PROVIDER:-openai}"
    echo "Provider: $provider"
    
    # Test health endpoint (includes AI health check)
    response=$(curl -s "$BASE_URL/health")
    ai_healthy=$(echo "$response" | jq -r '.ai.healthy')
    
    if [ "$ai_healthy" == "true" ]; then
        echo -e "${GREEN}✓ AI provider is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ AI provider health check failed${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Test AI Response Generation
test_ai_response() {
    echo -e "${BLUE}Testing AI Response Generation...${NC}"
    
    # Send a test message through the notify endpoint
    response=$(curl -s -X POST "$BASE_URL/notify" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_SECRET_KEY" \
        -d '{"message": "What is the status?"}')
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ AI response generation successful${NC}"
        return 0
    else
        echo -e "${RED}✗ AI response generation failed${NC}"
        return 1
    fi
}

# Add to main test suite
test_ai_provider
test_ai_response
```

### Manual Testing Checklist

**Provider Configuration**:
- [ ] Environment variables set correctly
- [ ] Provider-specific credentials configured
- [ ] Base URL reachable (for local providers)
- [ ] Model name valid for provider

**Service Health**:
- [ ] Health endpoint returns AI provider status
- [ ] AI health check passes
- [ ] Logs show correct provider initialization

**Message Flow**:
- [ ] LINE webhook receives messages
- [ ] AI generates appropriate responses
- [ ] Responses sent back to LINE
- [ ] Error messages are user-friendly

**Performance**:
- [ ] Response time acceptable (<5s for local, <10s for cloud)
- [ ] No memory leaks during extended use
- [ ] Graceful degradation on provider failure

---

## Migration Guide

### From OpenAI to OpenRouter

**Step 1**: Get OpenRouter API key

**Step 2**: Update `.env`:

```bash
# Change from:
OPENAI_API_KEY=sk-...
# To:
AI_PROVIDER=openrouter
AI_API_KEY=sk-or-v1-...
AI_MODEL=openai/gpt-3.5-turbo
```

**Step 3**: Restart service:

```bash
npm run dev
```

**Step 4**: Test with health check:

```bash
curl http://localhost:3002/health
```

### From Cloud to Local (Ollama)

**Step 1**: Install and start Ollama:

```bash
ollama pull llama2
ollama serve
```

**Step 2**: Update `.env`:

```bash
AI_PROVIDER=ollama
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama2
# API key not required for Ollama
AI_API_KEY=not-required
```

**Step 3**: Restart and test

### Rolling Back

**To revert to OpenAI**:

```bash
# Remove custom configuration
unset AI_PROVIDER
unset AI_BASE_URL
# Or explicitly set:
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

---

## Troubleshooting

### Common Issues

#### Issue: "Unknown AI provider"

**Cause**: Invalid `AI_PROVIDER` value

**Solution**:
```bash
# Check valid providers: openai, openrouter, localai, ollama, azure, custom
AI_PROVIDER=openai
```

#### Issue: "AI_API_KEY is required"

**Cause**: Missing API key for provider that requires authentication

**Solution**:
```bash
# For OpenAI/OpenRouter/Azure
AI_API_KEY=your-api-key-here

# For LocalAI/Ollama (no auth required)
AI_API_KEY=not-required
```

#### Issue: "Connection refused" (Local providers)

**Cause**: Local AI service not running

**Solution**:
```bash
# For Ollama
ollama serve

# For LocalAI
docker start localai

# Verify service is running
curl http://localhost:11434/v1/models  # Ollama
curl http://localhost:8080/v1/models   # LocalAI
```

#### Issue: "Model not found"

**Cause**: Invalid model name for provider

**Solution**:
```bash
# Check available models
curl $AI_BASE_URL/models

# For OpenRouter, use format: provider/model
AI_MODEL=openai/gpt-3.5-turbo

# For Ollama, use model name
AI_MODEL=llama2
```

#### Issue: Slow responses

**Cause**: Model too large for hardware or network latency

**Solutions**:
```bash
# Use smaller model
AI_MODEL=phi  # For Ollama (1.3B params)

# Increase timeout
AI_REQUEST_TIMEOUT=60000  # 60 seconds

# For local models, ensure GPU acceleration
docker run --gpus all localai/localai:latest
```

#### Issue: "Rate limit exceeded"

**Cause**: Too many requests to cloud provider

**Solutions**:
```bash
# Switch to OpenRouter (better rate limits)
AI_PROVIDER=openrouter

# Or use local provider (no rate limits)
AI_PROVIDER=ollama

# Implement request queuing in code
AI_MAX_RETRIES=5
```

### Debug Mode

**Enable verbose logging**:

```bash
LOG_LEVEL=debug
NODE_ENV=development
```

**Check logs for**:
- Provider initialization
- Request/response details
- Error messages with stack traces

### Health Monitoring

**Check AI provider health**:

```bash
curl http://localhost:3002/health | jq '.ai'
```

**Expected output**:
```json
{
  "provider": "openrouter",
  "healthy": true
}
```

---

## Security Considerations

### API Key Management

**Never commit API keys**:
```bash
# .gitignore already includes:
.env
.env.local
.env.*.local
```

**Rotate keys regularly**:
- OpenAI: Every 90 days
- OpenRouter: Every 90 days
- Azure: Use managed identities when possible

### Network Security

**For local providers**:
```bash
# Bind to localhost only
AI_BASE_URL=http://127.0.0.1:11434/v1

# Or use Docker network isolation
docker network create ai-network
```

**For cloud providers**:
```bash
# Use HTTPS only
AI_BASE_URL=https://api.openrouter.ai/v1

# Verify SSL certificates (default behavior)
```

### Data Privacy

**For sensitive data**:
- ✓ Use LocalAI or Ollama (data stays local)
- ✓ Use Azure OpenAI with private endpoints
- ✗ Avoid sending PII to public APIs

---

## Performance Optimization

### Response Times

**Expected latency by provider**:
- LocalAI (CPU): 2-10s depending on model size
- LocalAI (GPU): 0.5-2s
- Ollama (CPU): 1-8s
- Ollama (GPU): 0.3-1s
- OpenRouter: 1-5s (network dependent)
- Azure OpenAI: 1-3s (region dependent)

### Cost Optimization

**Provider comparison** (approximate, as of 2026-01):

| Provider | Model | Cost per 1M tokens |
|----------|-------|-------------------|
| OpenAI | GPT-3.5-turbo | $0.50 / $1.50 |
| OpenRouter | Same | $0.50 / $1.50 |
| LocalAI | Any | $0 (hardware cost) |
| Ollama | Any | $0 (hardware cost) |
| Azure | GPT-3.5 | Variable (contract) |

**Tips**:
- Use smaller models for simple queries
- Implement response caching
- Monitor usage via provider dashboards
- Set up billing alerts

---

## Next Steps

1. **Review this plan** with the team
2. **Choose preferred AI provider** based on requirements:
   - Privacy needs → LocalAI/Ollama
   - Cost sensitive → OpenRouter or local
   - Enterprise features → Azure OpenAI
   - Multiple models → OpenRouter
3. **Update** `.env.example` with new variables
4. **Implement** configuration changes (requires Code mode)
5. **Test** with each target provider
6. **Update** deployment documentation
7. **Monitor** performance and costs

---

## Questions for Clarification

Before implementation, please specify:

1. **Primary AI provider preference**:
   - Cloud (OpenRouter, Azure) for reliability?
   - Local (Ollama, LocalAI) for privacy?
   - Multiple providers with fallback?

2. **Model requirements**:
   - Specific model needed (GPT-4, Claude, Llama, etc.)?
   - Response quality vs. cost trade-off?
   - Response time requirements?

3. **Infrastructure**:
   - Will local provider run on same server?
   - GPU available for local inference?
   - Network restrictions (firewall, VPN)?

4. **Deployment environment**:
   - Development only or production?
   - Docker Compose or Kubernetes?
   - Cloud platform (Railway, AWS, Azure)?

---

## References

- [OpenAI SDK Documentation](https://github.com/openai/openai-node)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [LocalAI Documentation](https://localai.io/docs/)
- [Ollama Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Azure OpenAI Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [LINE Bot SDK Documentation](https://github.com/line/line-bot-sdk-nodejs)
