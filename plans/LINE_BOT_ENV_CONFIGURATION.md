# LINE Bot - Environment Configuration Guide

**Last Updated**: 2026-01-14  
**Purpose**: Updated `.env.example` with AI provider configuration

## Instructions

Replace the contents of [`services/line-bot/.env.example`](../services/line-bot/.env.example) with the configuration below. This adds support for multiple AI providers while maintaining backward compatibility.

## Updated .env.example Content

```bash
# LINE Bot Configuration

# LINE Messaging API Credentials
# Get these from: https://developers.line.biz/console/
LINE_CHANNEL_SECRET=e8e575a17c9847b835ff53e9ea81b7fd
LINE_CHANNEL_ACCESS_TOKEN=VAspANGGOvItOzldvJEQGC0XI4xDW5Z0UDTzBVDSqkHGI4zct5C5pcEjCN+jgObzWPs5DwrjSKIeIE2EPyP9mrBKz/XDSKAdEdY+HEOIGNYrB7vju/M7bYSwb2L1o/g0FAWqAe8YGMf0lZfT7BAq9gdB04t89/1O/w1cDnyilFU=

# =============================================================================
# AI Provider Configuration
# =============================================================================
# Options: 'openai' | 'openrouter' | 'localai' | 'ollama' | 'azure' | 'custom'
# Default: 'openai'
AI_PROVIDER=openai

# AI API Key
# - OpenAI: Get from https://platform.openai.com/api-keys (starts with sk-...)
# - OpenRouter: Get from https://openrouter.ai/keys (starts with sk-or-v1-...)
# - Azure: Get from Azure Portal "Keys and Endpoint" section
# - LocalAI/Ollama: Set to 'not-required' (no authentication needed)
# - Custom: Depends on your provider
AI_API_KEY=your_api_key_here

# AI Model Name
# Default models by provider:
# - openai: gpt-3.5-turbo, gpt-4, gpt-4-turbo-preview
# - openrouter: openai/gpt-3.5-turbo, anthropic/claude-3-opus, meta-llama/llama-3-70b-instruct
# - localai: gpt-3.5-turbo (mapped to local model in LocalAI)
# - ollama: llama2, mistral, phi, codellama
# - azure: gpt-35-turbo (your deployment name)
# - custom: Depends on your provider
AI_MODEL=gpt-3.5-turbo

# AI Base URL (Optional for openai, Required for other providers)
# - openai: Leave empty (uses default https://api.openai.com/v1)
# - openrouter: https://openrouter.ai/api/v1
# - localai: http://localhost:8080/v1 (or your LocalAI server)
# - ollama: http://localhost:11434/v1 (or your Ollama server)
# - azure: Automatically constructed from AZURE_* variables below
# - custom: Your custom API endpoint
AI_BASE_URL=

# AI Request Configuration
# Timeout in milliseconds (default: 30000 = 30 seconds)
AI_REQUEST_TIMEOUT=30000

# Maximum retry attempts for failed requests (default: 3)
AI_MAX_RETRIES=3

# Optional: Organization ID (OpenAI only)
AI_ORGANIZATION_ID=

# Optional: Custom HTTP headers in JSON format
# Example for OpenRouter to get better rate limits:
# AI_CUSTOM_HEADERS={"HTTP-Referer":"https://your-domain.com","X-Title":"NT-POC LINE Bot"}
AI_CUSTOM_HEADERS=

# =============================================================================
# Azure OpenAI Specific Configuration (when AI_PROVIDER=azure)
# =============================================================================
# Azure OpenAI Resource Name (e.g., your-resource-name)
AZURE_OPENAI_RESOURCE_NAME=

# Azure OpenAI Deployment ID (the name you gave to your model deployment)
AZURE_OPENAI_DEPLOYMENT_ID=

# Azure OpenAI API Version (default: 2024-02-15-preview)
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# =============================================================================
# Legacy OpenAI Configuration (DEPRECATED - Use AI_* variables above)
# =============================================================================
# Still supported for backward compatibility
# OPENAI_API_KEY=your_openai_api_key_here
# OPENAI_MODEL=gpt-3.5-turbo

# =============================================================================
# Server Configuration
# =============================================================================
PORT=3002
NODE_ENV=development

# Logging
LOG_LEVEL=info

# Security
# Generate a random string for API authentication
# Example: openssl rand -hex 32
API_SECRET_KEY=change_this_to_a_secure_random_string

# CORS Configuration
# Comma-separated list of allowed origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# Feature Flags
ENABLE_AI_RESPONSES=true

# Backend API Configuration (for fetching system context)
BACKEND_API_URL=http://localhost:3000
BACKEND_API_KEY=your_backend_api_key_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# =============================================================================
# Provider-Specific Examples
# =============================================================================

# Example 1: Using OpenAI (Default)
# AI_PROVIDER=openai
# AI_API_KEY=sk-proj-...
# AI_MODEL=gpt-3.5-turbo
# AI_BASE_URL= (leave empty)

# Example 2: Using OpenRouter (Multiple models, better pricing)
# AI_PROVIDER=openrouter
# AI_API_KEY=sk-or-v1-...
# AI_MODEL=openai/gpt-3.5-turbo
# AI_BASE_URL=https://openrouter.ai/api/v1
# AI_CUSTOM_HEADERS={"HTTP-Referer":"https://your-domain.com","X-Title":"NT-POC LINE Bot"}

# Example 3: Using LocalAI (Self-hosted, privacy-focused)
# AI_PROVIDER=localai
# AI_API_KEY=not-required
# AI_MODEL=gpt-3.5-turbo
# AI_BASE_URL=http://localhost:8080/v1

# Example 4: Using Ollama (Easy local deployment)
# AI_PROVIDER=ollama
# AI_API_KEY=not-required
# AI_MODEL=llama2
# AI_BASE_URL=http://localhost:11434/v1

# Example 5: Using Azure OpenAI (Enterprise)
# AI_PROVIDER=azure
# AI_API_KEY=your-azure-key
# AI_MODEL=gpt-35-turbo
# AZURE_OPENAI_RESOURCE_NAME=your-resource-name
# AZURE_OPENAI_DEPLOYMENT_ID=gpt-35-turbo
# AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Example 6: Using Custom Provider (e.g., self-hosted vLLM)
# AI_PROVIDER=custom
# AI_API_KEY=your-api-key-if-required
# AI_MODEL=mistralai/Mistral-7B-Instruct-v0.2
# AI_BASE_URL=http://localhost:8000/v1
```

## Changes Summary

### New Variables Added

1. **`AI_PROVIDER`**: Select AI provider (openai, openrouter, localai, ollama, azure, custom)
2. **`AI_API_KEY`**: Unified API key variable for all providers
3. **`AI_MODEL`**: Model name (provider-specific format)
4. **`AI_BASE_URL`**: Custom base URL for non-OpenAI providers
5. **`AI_REQUEST_TIMEOUT`**: Request timeout in milliseconds
6. **`AI_MAX_RETRIES`**: Maximum retry attempts
7. **`AI_ORGANIZATION_ID`**: Organization ID for OpenAI
8. **`AI_CUSTOM_HEADERS`**: Custom HTTP headers in JSON format
9. **`AZURE_OPENAI_RESOURCE_NAME`**: Azure resource name
10. **`AZURE_OPENAI_DEPLOYMENT_ID`**: Azure deployment ID
11. **`AZURE_OPENAI_API_VERSION`**: Azure API version

### Backward Compatibility

- **`OPENAI_API_KEY`**: Still supported but deprecated
- **`OPENAI_MODEL`**: Still supported but deprecated
- Existing `.env` files will continue to work without changes

### Migration Path

Users can migrate gradually:

**Phase 1** (Current setup continues to work):
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo
```

**Phase 2** (Migrate to new format):
```bash
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=gpt-3.5-turbo
```

**Phase 3** (Switch to different provider):
```bash
AI_PROVIDER=openrouter
AI_API_KEY=sk-or-v1-...
AI_MODEL=openai/gpt-3.5-turbo
AI_BASE_URL=https://openrouter.ai/api/v1
```

## Quick Start Examples

### Using OpenRouter

```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env
AI_PROVIDER=openrouter
AI_API_KEY=sk-or-v1-your-key-here
AI_MODEL=openai/gpt-3.5-turbo
AI_BASE_URL=https://openrouter.ai/api/v1
```

### Using Ollama (Local)

```bash
# Start Ollama
ollama pull llama2
ollama serve

# Configure .env
AI_PROVIDER=ollama
AI_API_KEY=not-required
AI_MODEL=llama2
AI_BASE_URL=http://localhost:11434/v1
```

### Using LocalAI (Docker)

```bash
# Start LocalAI
docker run -d --name localai -p 8080:8080 localai/localai:latest

# Configure .env
AI_PROVIDER=localai
AI_API_KEY=not-required
AI_MODEL=gpt-3.5-turbo
AI_BASE_URL=http://localhost:8080/v1
```

## Validation

After updating `.env.example`, verify the configuration:

1. **Copy to `.env`**:
   ```bash
   cd services/line-bot
   cp .env.example .env
   ```

2. **Edit with your actual credentials**:
   ```bash
   nano .env  # or your preferred editor
   ```

3. **Test configuration**:
   ```bash
   npm run dev
   # Check logs for "AI Provider initialized"
   ```

4. **Health check**:
   ```bash
   curl http://localhost:3002/health
   # Should show ai.provider and ai.healthy fields
   ```

## Related Documentation

- Main implementation plan: [`plans/LINE_BOT_CUSTOM_AI_PROVIDER.md`](./LINE_BOT_CUSTOM_AI_PROVIDER.md)
- Original setup guide: [`plans/LINE_BOT_LOCAL_DEV_SETUP.md`](./LINE_BOT_LOCAL_DEV_SETUP.md)
- Testing documentation: [`services/line-bot/TESTING_SCRIPT.md`](../services/line-bot/TESTING_SCRIPT.md)
