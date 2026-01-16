# Frontend Blank Screen Fix

## Issue
Frontend was showing a blank screen due to Gemini AI initialization error:
```
Uncaught Error: An API Key must be set when running in a browser
    at new GoogleGenAI (@google_genai.js?v=e355ac79:16446:13)
    at geminiService.ts:6:12
```

## Root Cause
1. Missing `.env` file in `services/frontend/`
2. `geminiService.ts` was trying to initialize GoogleGenAI without checking if API key was available
3. The initialization error was thrown during module load, preventing the entire app from loading

## Fix Applied

### 1. Created `.env` file
Created `services/frontend/.env` with the Gemini API key:
```bash
VITE_GEMINI_API_KEY=AIzaSyCmELyd53kGMRg4v-RszkR1ebdlUBJeXy4
```

### 2. Updated `geminiService.ts`
Modified the AI client initialization to be more defensive:

**Before:**
```typescript
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY });
```

**After:**
```typescript
// Get API key from environment variables
const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key || key === 'your-google-gemini-api-key') {
    console.warn('Gemini API key not configured. AI features will be limited.');
    return null;
  }
  return key;
};

// Initialize AI client only if API key is available
let ai: GoogleGenAI | null = null;
const apiKey = getApiKey();
if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error('Failed to initialize Gemini AI:', error);
  }
}
```

### 3. Added null checks to AI functions
Updated all functions that use the `ai` client to check if it's available:

**Example:**
```typescript
export const sendChatMessage = async (...) => {
  // ... setup code ...
  
  // Check if AI is available
  if (!ai) {
    return {
      text: "ขออภัย บริการ AI ไม่พร้อมใช้งานในขณะนี้ กรุณาตั้งค่า API Key หรือติดต่อผู้ดูแลระบบ",
      actions: []
    };
  }
  
  // ... rest of function ...
};
```

Similar checks added to:
- `generateReportDraft()`
- `generateReportFromAlert()`
- All other AI-dependent functions

## Result
✅ Frontend now loads successfully even if API key is missing
✅ Graceful degradation - app works with limited AI features if key is not configured
✅ No more blank screen errors
✅ Dev server running at http://localhost:5173/

## Testing
```bash
cd services/frontend
npm run dev
```

The app should now load successfully in the browser without any initialization errors.

## Files Modified
1. `services/frontend/.env` (created)
2. `services/frontend/src/services/geminiService.ts` (updated)

## Note
The `.env` file is gitignored, so for deployment you need to set the environment variables:
- **Local Dev**: Use `.env` file
- **Railway/Production**: Set `VITE_GEMINI_API_KEY` in Railway environment variables
