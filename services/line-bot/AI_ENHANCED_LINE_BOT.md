# AI-Enhanced LINE OA Bot

## Overview

The LINE Official Account (OA) bot has been significantly enhanced with advanced AI capabilities, providing an intelligent interface for monitoring the Battery Management System through LINE messaging platform.

## Key Features

### 1. **AI-Powered Conversational Interface**
- Natural language processing for user queries
- Context-aware conversations with 30-minute memory
- Function calling capability to access real-time system data
- Supports both English and Thai language

### 2. **Intent Recognition**
The bot automatically detects user intent from messages:
- **Greetings**: Welcome messages
- **Help**: Commands and capabilities
- **Facility Management**: View and search facilities
- **Alert Management**: Check alerts, acknowledge, filter by severity
- **System Status**: Overall health monitoring
- **Natural Queries**: Complex questions handled by AI

### 3. **Rich Message Support**
- **Flex Messages**: Beautiful card-based interfaces for:
  - Facility status cards with health metrics
  - Alert cards with severity indicators
  - Summary cards with statistics
- **Quick Replies**: Context-aware action buttons
- **Interactive Elements**: Buttons and actions

### 4. **Backend Integration**
Full integration with backend APIs:
- Facility monitoring and health status
- Real-time alert management
- Battery predictions (RUL)
- KPI tracking
- System health checks

### 5. **Conversation Context**
- Maintains conversation history per user
- Remembers previous questions and answers
- Context expires after 30 minutes of inactivity
- Can be manually reset with "clear" or "reset" commands

## Architecture

```
┌─────────────────┐
│   LINE Users    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LINE Platform  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   LINE Bot      │
│   Webhook       │
└────────┬────────┘
         │
         ├──────────┐
         │          │
         ▼          ▼
┌──────────────┐  ┌──────────────┐
│ Intent       │  │ AI Response  │
│ Recognition  │  │ Service      │
└──────┬───────┘  └──────┬───────┘
       │                  │
       │                  ▼
       │          ┌──────────────┐
       │          │   OpenAI     │
       │          │ GPT-4/3.5    │
       │          └──────┬───────┘
       │                 │
       │        ┌────────┴────────┐
       │        │                 │
       ▼        ▼                 ▼
┌──────────────┐      ┌──────────────┐
│ Rich Message │      │  Backend API │
│  Generator   │      │  Integration │
└──────────────┘      └──────────────┘
                               │
                               ▼
                      ┌──────────────┐
                      │  NT-POC      │
                      │  Backend     │
                      └──────────────┘
```

## Services

### 1. AIResponseService ([`aiResponse.ts`](./src/services/aiResponse.ts))
**Purpose**: Intelligent response generation with function calling

**Features**:
- OpenAI GPT integration (GPT-4 Turbo or GPT-3.5)
- Function calling to fetch real-time data
- Conversation context management
- Multi-turn conversations

**Available Functions**:
1. `get_facilities` - List all facilities with health status
2. `get_facility_details` - Get specific facility info and KPIs
3. `get_alert_summary` - Get alert counts by severity
4. `get_alerts` - List alerts with filters (severity, status)
5. `get_alert_details` - Get specific alert information
6. `acknowledge_alert` - Mark alert as acknowledged
7. `get_battery_prediction` - Get RUL prediction for battery
8. `search_facilities` - Search facilities by name/location

**Example Usage**:
```typescript
const response = await aiResponseService.generateResponse(
  "How many critical alerts do we have?",
  userId
);
```

### 2. BackendApiService ([`backendApi.ts`](./src/services/backendApi.ts))
**Purpose**: Interface with NT-POC backend APIs

**Methods**:
- `getFacilities()` - Get all facilities with health
- `getFacility(id)` - Get specific facility
- `getFacilityKpis(id)` - Get facility KPIs
- `getAlertSummary()` - Get alert summary
- `getAlerts(filters)` - Get alerts with filters
- `getAlert(id)` - Get specific alert
- `acknowledgeAlert(id)` - Acknowledge alert
- `getLatestPrediction(batteryId)` - Get RUL prediction
- `searchFacilities(query)` - Search facilities

### 3. RichMessageService ([`richMessages.ts`](./src/services/richMessages.ts))
**Purpose**: Create beautiful LINE Flex Messages and Quick Replies

**Methods**:
- `createFacilityCard()` - Facility status card with metrics
- `createAlertCard()` - Alert card with actions
- `createAlertSummaryCard()` - Alert statistics card
- `createQuickReply(type)` - Context-aware quick replies
  - Types: 'main', 'facilities', 'alerts', 'help'

### 4. LineBotService ([`lineBot.ts`](./src/services/lineBot.ts))
**Purpose**: Main bot logic and webhook handling

**Features**:
- Event handling (messages, follow, unfollow, postback)
- Intent detection and routing
- Message orchestration
- Broadcasting capabilities

## User Commands

### Quick Commands
| Command | Description |
|---------|-------------|
| `hi`, `hello`, `hey` | Greeting message |
| `help`, `commands` | List available commands |
| `menu`, `main` | Show main menu |
| `Show facilities` | List all facilities |
| `Show alerts` | Alert summary |
| `Critical alerts` | Critical alerts only |
| `Warning alerts` | Warning alerts only |
| `System status` | Overall system health |
| `clear`, `reset` | Clear conversation context |

### Natural Language Examples
- "How many critical alerts do we have?"
- "What's the health status of facility X?"
- "Show me battery predictions"
- "Are there any issues at the Bangkok facility?"
- "Acknowledge alert alert-123"
- "What's the average SoC across all facilities?"

## Configuration

### Environment Variables

```bash
# LINE Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4-turbo-preview  # or gpt-3.5-turbo
AI_BASE_URL=https://api.openai.com/v1  # optional

# Backend API
BACKEND_API_URL=http://localhost:3000

# Server
PORT=3002
NODE_ENV=production
```

### LINE Channel Setup

1. **Create LINE Official Account**
   - Go to LINE Developers Console
   - Create a new provider (if needed)
   - Create a new Messaging API channel

2. **Configure Webhook**
   - Webhook URL: `https://your-domain.com/webhook`
   - Enable "Use webhook"
   - Disable "Auto-reply messages"
   - Disable "Greeting messages" (bot handles it)

3. **Get Credentials**
   - Channel Access Token (long-lived)
   - Channel Secret

4. **Set Permissions**
   - Enable "Messaging API"
   - Enable "LINE Login" (optional)

## Testing

### Manual Testing Checklist

1. **Basic Interaction**
   - [ ] Send "hello" → Receives greeting
   - [ ] Send "help" → Receives command list
   - [ ] Send "menu" → Receives quick replies

2. **Facility Features**
   - [ ] "Show facilities" → Receives facility cards
   - [ ] "Search [facility name]" → Finds facilities
   - [ ] Click facility "View Details" button

3. **Alert Features**
   - [ ] "Show alerts" → Receives alert summary card
   - [ ] "Critical alerts" → Receives critical alert cards
   - [ ] "Acknowledge alert [id]" → Acknowledges successfully

4. **AI Conversation**
   - [ ] Ask natural question → Receives intelligent response
   - [ ] Ask follow-up question → Maintains context
   - [ ] "clear" → Resets conversation

5. **Rich Messages**
   - [ ] Verify Flex messages display correctly
   - [ ] Click quick reply buttons
   - [ ] Tap card action buttons

### Automated Testing

```bash
cd services/line-bot
npm test
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Railway/Heroku

```bash
# Build
npm run build

# Start
npm start
```

### Environment Setup

Ensure all environment variables are set in your deployment platform.

## Monitoring

### Logs

The bot uses Winston for structured logging:

```typescript
logger.info('Message received', { userId, message });
logger.error('Error handling event', { error, eventType });
logger.debug('Function called', { functionName, args });
```

### Metrics to Monitor

1. **Message Volume**
   - Messages received per hour
   - Response time
   - Error rate

2. **AI Performance**
   - Token usage
   - Function call frequency
   - Response generation time

3. **Backend API**
   - API response times
   - API error rates
   - Rate limiting

## Best Practices

### 1. Conversation Design
- Keep responses concise (LINE optimal length: < 500 chars)
- Use emojis sparingly for visual clarity
- Provide clear next actions via quick replies
- Handle errors gracefully with fallback messages

### 2. AI Prompt Engineering
- System prompt defines personality and capabilities
- Function descriptions must be clear and specific
- Include examples in function parameters
- Handle function call errors gracefully

### 3. Performance
- Cache frequently accessed data
- Implement rate limiting for AI calls
- Use async/await properly
- Clean up expired conversation contexts

### 4. Security
- Validate LINE webhook signatures
- Never expose API keys in logs
- Sanitize user inputs before function calls
- Implement user authentication if needed

## Troubleshooting

### Common Issues

**Issue**: Bot not responding
- Check webhook URL is correct and accessible
- Verify LINE_CHANNEL_ACCESS_TOKEN is valid
- Check server logs for errors

**Issue**: AI responses are slow
- Consider using gpt-3.5-turbo instead of gpt-4
- Implement response streaming (future enhancement)
- Cache common queries

**Issue**: Function calls failing
- Verify BACKEND_API_URL is correct
- Check backend API is running
- Review backend API logs

**Issue**: TypeScript type errors
- Type assertions (`as any`) are used for LINE SDK compatibility
- These are cosmetic and don't affect runtime

## Future Enhancements

### Planned Features
1. **Multi-language Support**
   - Detect user language
   - Respond in appropriate language

2. **Proactive Notifications**
   - Send critical alerts automatically
   - Daily/weekly summaries

3. **Rich Media**
   - Charts and graphs in messages
   - Images for facility maps

4. **Advanced Analytics**
   - User behavior tracking
   - Popular queries analysis
   - Conversation flow optimization

5. **Voice Support**
   - Audio message handling
   - Voice command recognition

### API Enhancements
1. **Batch Operations**
   - Bulk alert acknowledgment
   - Multi-facility queries

2. **Caching Layer**
   - Redis for conversation context
   - API response caching

3. **WebSocket Support**
   - Real-time updates
   - Live data streaming

## Contributing

### Adding New Intents

1. Update `detectIntent()` in [`lineBot.ts`](./src/services/lineBot.ts)
2. Add handler in `handleIntent()`
3. Create rich message template if needed
4. Update documentation

### Adding AI Functions

1. Add function definition in [`aiResponse.ts`](./src/services/aiResponse.ts)
2. Implement function logic in `executeFunction()`
3. Add corresponding backend API call if needed
4. Test with various user queries

## Support

For issues and questions:
- Check logs first
- Review LINE Developer Console
- Check backend API status
- Review conversation context state

## License

[Your License Here]

## Authors

NT-POC Development Team

---

**Last Updated**: January 2026
**Version**: 2.0.0 (AI-Enhanced)
