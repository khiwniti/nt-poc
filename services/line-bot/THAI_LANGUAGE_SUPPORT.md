# Thai Language Support - LINE OA Bot

## Overview

The LINE OA Bot now supports **bilingual operation** with both English and Thai (ภาษาไทย) language support. The AI automatically detects the user's language and responds accordingly.

## Implementation Summary

### 1. AI Response Service (`aiResponse.ts`)

**Key Changes:**
- Updated OpenAI system prompt to include language detection and Thai response capabilities
- AI automatically matches the user's language (English or Thai)
- Configured to use GitHub Models with `gpt-4o` model

```typescript
this.systemPrompt = `...
Language Support:
- Respond in the same language as the user's question
- Support both English and Thai (ภาษาไทย)
- Use appropriate technical terms for each language
...`;
```

**Configuration:**
```bash
# GitHub Models (Recommended)
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_MODEL_ENDPOINT=https://models.inference.ai.azure.com
AI_MODEL=gpt-4o
```

### 2. LINE Bot Service (`lineBot.ts`)

**Updated Messages:**
- Welcome/greeting messages (follow event)
- Help command responses
- Main menu prompts

**Example Bilingual Greeting:**
```
👋 สวัสดีครับ/ค่ะ! ฉันคือผู้ช่วยระบบจัดการแบตเตอรี่

ฉันสามารถช่วยคุณ:
• ติดตามสถานะโรงงาน
• ตรวจสอบการแจ้งเตือน
• ดูการคาดการณ์
• ตรวจสอบสถานะระบบ

คุณต้องการทราบอะไรครับ/คะ?

---

👋 Hello! I'm your Battery Management System assistant.

I can help you:
• Monitor facilities
• Check alerts
• View predictions
• Get system status

What would you like to know?
```

### 3. Rich Messages Service (`richMessages.ts`)

**Updated Quick Reply Buttons:**

| Context | Button Label (Thai) | Original (English) |
|---------|--------------------|--------------------|
| Main Menu | 🏢 โรงงาน | 🏢 Facilities |
| Main Menu | 🚨 แจ้งเตือน | 🚨 Alerts |
| Main Menu | 📊 สถานะ | 📊 Status |
| Main Menu | ❓ ช่วยเหลือ | ❓ Help |
| Facilities | 🔍 ค้นหา | 🔍 Search |
| Facilities | 📋 ทั้งหมด | 📋 List All |
| Facilities | 🏠 เมนูหลัก | 🏠 Main Menu |
| Alerts | 🔴 วิกฤติ | 🔴 Critical |
| Alerts | 🟡 คำเตือน | 🟡 Warning |
| Alerts | 📊 สรุป | 📊 Summary |
| Help | 📖 คำสั่ง | 📖 Commands |
| Help | 🤖 เกี่ยวกับ AI | 🤖 About AI |

## Language Detection Strategy

### Automatic Detection by AI
The AI model (`gpt-4o`) automatically:
1. Detects the language of the user's message
2. Formulates responses in the same language
3. Uses appropriate technical terminology
4. Maintains context across conversation

### User Interface
- **Quick Reply buttons**: Display Thai labels for better UX
- **Greeting messages**: Show both Thai and English
- **Help text**: Bilingual format for clarity
- **AI responses**: Match user's language automatically

## Usage Examples

### Thai Language Examples

```
User: สถานะระบบเป็นอย่างไร?
Bot: [AI responds in Thai with system status]

User: มีการแจ้งเตือนอะไรบ้าง?
Bot: [AI responds in Thai with alert information]

User: แสดงข้อมูลโรงงาน
Bot: [Shows facility cards with AI commentary in Thai]
```

### English Language Examples

```
User: What's the system status?
Bot: [AI responds in English with system status]

User: Show me critical alerts
Bot: [AI responds in English with alert information]

User: List all facilities
Bot: [Shows facility cards with AI commentary in English]
```

### Mixed Language Support

```
User: Show facilities (button click)
Bot: [AI can respond in either language based on previous conversation context]

User: ช่วยเหลือ (Help button)
Bot: [Shows bilingual help message]
```

## Technical Details

### AI Model Configuration

**GitHub Models (Azure OpenAI Compatible):**
- Endpoint: `https://models.inference.ai.azure.com`
- Model: `gpt-4o` (default)
- Authentication: GitHub Personal Access Token
- Features: Function calling, multilingual support, conversation context

**Alternative Models:**
- `gpt-4o-mini`: Faster, lower cost
- `gpt-4`: Previous generation
- `gpt-3.5-turbo`: Budget option

### Function Calling in Thai/English

The AI can call backend functions regardless of input language:

```
User (Thai): ตรวจสอบสถานะแบตเตอรี่ที่ 123
→ AI calls: get_battery_prediction({ batteryId: "123" })
→ AI responds in Thai with prediction data

User (English): Check battery 123 status
→ AI calls: get_battery_prediction({ batteryId: "123" })
→ AI responds in English with prediction data
```

### Available AI Functions (Language-Agnostic)

1. `list_facilities()` - โรงงานทั้งหมด / All facilities
2. `get_facility_details(facilityId)` - รายละเอียดโรงงาน / Facility details
3. `list_alerts(severity?)` - การแจ้งเตือน / Alerts
4. `acknowledge_alert(alertId)` - รับทราบการแจ้งเตือน / Acknowledge alert
5. `get_system_health()` - สุขภาพระบบ / System health
6. `get_battery_prediction(batteryId)` - คาดการณ์แบตเตอรี่ / Battery prediction
7. `list_predictions()` - คาดการณ์ทั้งหมด / All predictions
8. `search_facilities(query)` - ค้นหาโรงงาน / Search facilities

## Environment Configuration

### Required Environment Variables

```bash
# LINE Configuration (Required)
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# AI Configuration (Option 1: GitHub Models - Recommended)
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_MODEL_ENDPOINT=https://models.inference.ai.azure.com
AI_MODEL=gpt-4o

# Backend API (Required)
BACKEND_API_URL=http://localhost:3000

# Server Configuration
PORT=3002
NODE_ENV=development
LOG_LEVEL=info
```

## Testing Thai Language Support

### Manual Testing Checklist

1. **Greeting Messages**
   - [ ] New user follow event shows bilingual greeting
   - [ ] Thai text displays correctly
   - [ ] Quick reply buttons show Thai labels

2. **Natural Language Queries (Thai)**
   - [ ] "สถานะระบบ" returns system status in Thai
   - [ ] "แสดงโรงงาน" returns facility list with Thai commentary
   - [ ] "การแจ้งเตือนวิกฤติ" returns critical alerts in Thai

3. **Natural Language Queries (English)**
   - [ ] "system status" returns system status in English
   - [ ] "show facilities" returns facility list with English commentary
   - [ ] "critical alerts" returns critical alerts in English

4. **Quick Reply Buttons**
   - [ ] All Thai button labels display correctly
   - [ ] Button actions trigger appropriate responses
   - [ ] Context-sensitive buttons appear correctly

5. **Mixed Conversation**
   - [ ] AI maintains context across language switches
   - [ ] Function calls work regardless of language
   - [ ] Help text shows in bilingual format

### Testing Commands (Thai)

```bash
# Send via LINE app
สวัสดี
สถานะระบบ
แสดงโรงงาน
การแจ้งเตือน
ช่วยเหลือ
คำสั่ง
แสดงการแจ้งเตือนวิกฤติ
โรงงานมีกี่แห่ง?
แบตเตอรี่สุขภาพดีไหม?
```

### Testing Commands (English)

```bash
# Send via LINE app
hello
system status
show facilities
alerts
help
commands
show critical alerts
how many facilities?
is battery healthy?
```

## Localization Strategy

### Current Implementation
- **UI Elements**: Thai labels on buttons and menus
- **Static Messages**: Bilingual format (Thai + English)
- **AI Responses**: Automatic language matching via AI

### Future Enhancements
1. **Full Localization**
   - Separate language files (`th.json`, `en.json`)
   - User language preference storage
   - Consistent terminology across all messages

2. **Additional Languages**
   - Framework supports adding more languages
   - AI models support 50+ languages
   - Consider: Japanese, Chinese, Vietnamese

3. **Rich Messages**
   - Localized Flex Message content
   - Language-specific date/time formatting
   - Cultural-appropriate number formatting

## Performance Considerations

### Token Usage
- Thai text uses more tokens than English (Unicode characters)
- Average Thai response: ~150-200 tokens
- Average English response: ~100-150 tokens
- Budget accordingly for API costs

### Response Time
- Language detection: Minimal overhead (handled by AI)
- Thai text rendering: No performance impact
- Function calling: Language-agnostic (no difference)

## Troubleshooting

### Thai Text Not Displaying
**Issue**: Thai characters show as boxes or question marks
**Solution**: 
- Verify LINE app supports Thai (all versions should)
- Check server encoding is UTF-8
- Confirm environment variables are properly encoded

### AI Responding in Wrong Language
**Issue**: User asks in Thai but gets English response
**Solution**:
- Check AI model is `gpt-4o` (better multilingual support)
- Verify system prompt includes language instructions
- Clear conversation context and retry
- Consider user's previous messages (context matters)

### Mixed Language in Single Response
**Issue**: AI mixes Thai and English in one response
**Solution**:
- Update system prompt to be more explicit about language consistency
- Provide clearer examples in system prompt
- Use temperature parameter to reduce randomness

## Best Practices

### For Thai Language Support
1. **Be explicit in system prompts**: "Always respond in the SAME language"
2. **Use appropriate models**: `gpt-4o` has better Thai support than `gpt-3.5-turbo`
3. **Test edge cases**: Numbers, technical terms, abbreviations
4. **Maintain consistency**: Don't mix languages within single messages
5. **Cultural sensitivity**: Use appropriate formal/informal Thai (ครับ/ค่ะ)

### For Multilingual Bots
1. **Language detection**: Let AI handle it automatically
2. **Fallback language**: Default to English if uncertain
3. **User preferences**: Consider storing language preference
4. **Context awareness**: Maintain language across conversation
5. **Testing**: Test in both languages regularly

## Related Files

- [`services/line-bot/src/services/aiResponse.ts`](src/services/aiResponse.ts) - AI service with Thai support
- [`services/line-bot/src/services/lineBot.ts`](src/services/lineBot.ts) - Bot logic with bilingual messages
- [`services/line-bot/src/services/richMessages.ts`](src/services/richMessages.ts) - UI with Thai labels
- [`services/line-bot/.env.example`](.env.example) - Configuration template

## References

- [LINE Messaging API Documentation](https://developers.line.biz/en/docs/messaging-api/)
- [OpenAI GPT-4o Model Documentation](https://platform.openai.com/docs/models/gpt-4o)
- [GitHub Models Documentation](https://docs.github.com/en/github-models)
- [Thai Language in NLP](https://pythainlp.github.io/)

---

**Last Updated**: 2026-01-15  
**Version**: 1.0.0  
**Status**: ✅ Active
