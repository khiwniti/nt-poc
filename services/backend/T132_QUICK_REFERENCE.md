# T132: Email Notifications - Quick Reference

## Setup

### 1. Environment Variables
```bash
SENDGRID_API_KEY=your-api-key-here
EMAIL_FROM=alerts@yourdomain.com
EMAIL_FROM_NAME=Battery Management System
DASHBOARD_BASE_URL=https://yourdomain.com
```

### 2. Get SendGrid API Key
1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create API key with "Mail Send" permission
3. Verify sender email address

## Quick Start

### Configure Facility
```bash
curl -X POST http://localhost:3000/api/v1/alerts/email/configure \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "facilityId": "facility-1",
    "recipients": [
      {"email": "admin@example.com", "name": "Admin"}
    ],
    "enabled": true
  }'
```

### Send Notification
```bash
curl -X POST http://localhost:3000/api/v1/alerts/alert-123/notify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"facilityId": "facility-1"}'
```

### Check Status
```bash
curl http://localhost:3000/api/v1/alerts/alert-123/email-status \
  -H "Authorization: Bearer $TOKEN"
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/alerts/email/configure` | Configure facility notifications |
| GET | `/api/v1/alerts/email/configure/:facilityId` | Get facility config |
| GET | `/api/v1/alerts/email/configure` | List all configs |
| POST | `/api/v1/alerts/:id/notify` | Send email for alert |
| GET | `/api/v1/alerts/:id/email-status` | Get delivery status |

## Key Features

✅ **SendGrid Integration** - Professional email delivery  
✅ **HTML Templates** - Beautiful, responsive emails  
✅ **Rate Limiting** - Max 1 email per alert  
✅ **Dashboard Links** - One-click access to alert details  
✅ **Status Tracking** - Monitor delivery success/failure  
✅ **Multi-Recipient** - Send to multiple people per facility  

## Important Notes

- **Only critical alerts** trigger email notifications
- **Rate limited** to 1 email per alert (no duplicates)
- **Authentication required** for all endpoints
- **Facility must be configured** before sending notifications

## Testing

```bash
# Run all email notification tests
cd services/backend
npm test -- emailNotification --run

# Service tests (18 tests)
npm test -- src/services/__tests__/emailNotificationService.test.ts --run

# Route tests (20 tests)
npm test -- src/routes/__tests__/alertsEmail.test.ts --run
```

## Email Template Preview

Emails include:
- Alert severity badge (color-coded)
- Alert type and message
- Battery system and zone information
- Timestamp
- Metadata (thresholds, values)
- Dashboard link button

Colors:
- 🚨 Critical: Red
- ⚠️ Warning: Orange
- ℹ️ Info: Blue

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Emails not sending | Check `SENDGRID_API_KEY` is set and valid |
| No recipients | Configure facility with `POST /email/configure` |
| Rate limit | Alert already received notification (by design) |
| 400 Error | Ensure alert severity is "critical" |

## Files Modified/Created

```
services/backend/
├── src/
│   ├── types/emailNotification.ts               # New types
│   ├── services/emailNotificationService.ts     # New service
│   ├── services/__tests__/emailNotificationService.test.ts
│   ├── routes/alerts.ts                         # Updated
│   └── routes/__tests__/alertsEmail.test.ts     # New tests
├── .env.example                                 # Updated
└── T132_IMPLEMENTATION_COMPLETE.md              # Documentation
```

## Production Checklist

- [ ] Set SendGrid API key in production
- [ ] Verify sender email in SendGrid
- [ ] Configure production dashboard URL
- [ ] Test email delivery
- [ ] Monitor SendGrid quota
- [ ] Set up delivery failure alerts

---

**Status**: ✅ Complete | **Tests**: 38/38 passing | **Ready for**: Production
