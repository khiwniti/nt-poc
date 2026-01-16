import { GoogleGenAI, Type } from '@google/genai';
import { ChatMessage, AIResponse, Branch, Alert, ReportDocument, ISOStandard } from '../types';
import axios from 'axios';

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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Fetch RAG context from backend
const fetchChatbotContext = async (
  token: string,
  facilityId?: string,
  batterySystemId?: string
) => {
  try {
    const params = new URLSearchParams();
    if (facilityId) params.append('facilityId', facilityId);
    if (batterySystemId) params.append('batterySystemId', batterySystemId);

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/chatbot/context?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch chatbot context:', error);
    return null;
  }
};

// Fetch quick summary
const fetchSystemSummary = async (token: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/v1/chatbot/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch system summary:', error);
    return null;
  }
};

// Search backend data
const searchBackendData = async (token: string, query: string, type?: string) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/chatbot/search`,
      { query, type },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to search backend data:', error);
    return null;
  }
};

export const sendChatMessage = async (
  message: string,
  history: ChatMessage[],
  context: any,
  token?: string
): Promise<AIResponse> => {
  let ragContext = null;
  let summary = null;

  // Fetch RAG context from backend if token is provided
  if (token) {
    const facilityId = context?.currentFacilityId;
    const batterySystemId = context?.currentBatteryId;

    // Fetch comprehensive context
    ragContext = await fetchChatbotContext(token, facilityId, batterySystemId);

    // Fetch system summary
    summary = await fetchSystemSummary(token);

    // If user is asking about specific things, search for them
    if (message.includes('ค้นหา') || message.includes('search') || message.includes('หา')) {
      const searchResults = await searchBackendData(token, message);
      if (searchResults) {
        ragContext = { ...ragContext, searchResults };
      }
    }
  }

  // Build enhanced prompt with RAG context
  let enhancedPrompt = `You are NT AIOps Assistant - an advanced AI agent for Battery Management and Facility Operations.

**Your Capabilities:**
1. Monitor and analyze battery systems, alerts, and sensor data
2. Generate ISO-compliant reports (ISO 27001, ISO 22301, ISO 50001)
3. Provide predictive maintenance insights from RUL predictions
4. Search and summarize facility data
5. Answer questions using real-time system data

**User Message:** ${message}

**Current Context from Branches/Alerts passed by UI:**
${JSON.stringify(context, null, 2)}
`;

  if (summary) {
    enhancedPrompt += `\n**System Summary:**
- Active Facilities: ${summary.activeFacilities}
- Active Batteries: ${summary.activeBatteries}
- Critical Alerts: ${summary.criticalAlerts}
- Warning Alerts: ${summary.warningAlerts}
- Average Battery Health: ${summary.averageBatteryHealth}%
- Recent Predictions (24h): ${summary.recentPredictions}
`;
  }

  if (ragContext) {
    enhancedPrompt += `\n**Real-Time Data from Database (RAG Context):**

**Recent Alerts:**
${JSON.stringify(ragContext.alerts?.slice(0, 5) || [], null, 2)}

**Battery Systems Status:**
${JSON.stringify(ragContext.batteries?.slice(0, 5) || [], null, 2)}

**Recent RUL Predictions:**
${JSON.stringify(ragContext.predictions?.slice(0, 5) || [], null, 2)}

**Statistics:**
${JSON.stringify(ragContext.statistics || {}, null, 2)}

**Search Results (if applicable):**
${JSON.stringify(ragContext.searchResults || {}, null, 2)}
`;
  }

  enhancedPrompt += `\n**Instructions:**
- Respond professionally in Thai language
- Use the RAG context above to provide accurate, data-driven answers
- If asked about alerts, reference specific alert IDs and details
- If asked about battery health, cite actual SoH values and sensor readings
- If asked about predictions, mention RUL values and confidence scores
- For reports, structure your response clearly with ISO standard references
- Suggest actions when appropriate (view changes, 3D visualization, etc.)
- Always be concise but informative

Respond now:`;

  // Check if AI is available
  if (!ai) {
    return {
      text: 'ขออภัย บริการ AI ไม่พร้อมใช้งานในขณะนี้ กรุณาตั้งค่า API Key หรือติดต่อผู้ดูแลระบบ',
      actions: [],
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
    config: { temperature: 0.7 },
  });

  const text = response.text || 'ขออภัยครับ ไม่สามารถประมวลผลคำขอได้ในขณะนี้';
  const lower = message.toLowerCase();
  const actions: any[] = [];

  // Intelligent action detection
  if (lower.includes('รายงาน') || lower.includes('report')) {
    actions.push({ type: 'CHANGE_VIEW', payload: 'reports' });
  }
  if (lower.includes('แผนที่') || lower.includes('map')) {
    actions.push({ type: 'CHANGE_VIEW', payload: 'map' });
  }
  if (lower.includes('3d') || lower.includes('สามมิติ')) {
    actions.push({ type: 'OPEN_3D_MODE', payload: context?.branches?.[0] });
  }
  if (lower.includes('การบำรุงรักษา') || lower.includes('maintenance')) {
    actions.push({ type: 'CHANGE_VIEW', payload: 'maintenance' });
  }
  if (lower.includes('แจ้งเตือน') || lower.includes('alert')) {
    actions.push({ type: 'CHANGE_VIEW', payload: 'intelligence' });
  }

  return { text, actions };
};

export const generateReportDraft = async (
  prompt: string,
  standard: ISOStandard = 'ISO-27001'
): Promise<Partial<ReportDocument>> => {
  if (!ai) {
    console.warn('AI not available for report generation');
    return { title: 'รายงานเหตุการณ์', blocks: [] };
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a professional report draft for: "${prompt}".
          Standard: ${standard}. 
          JSON Response only with title, isoControlId, classification, and blocks array. 
          Each block must have {id, type, content}. types: h1, h2, paragraph, bullet, todo, ai-insight.`,
      config: { responseMimeType: 'application/json' },
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Failed to generate report draft:', error);
    return { title: 'รายงานเหตุการณ์', blocks: [] };
  }
};

export const generateReportFromAlert = async (
  alert: Alert,
  branch?: Branch
): Promise<Partial<ReportDocument>> => {
  if (!ai) {
    console.warn('AI not available for report generation from alert');
    return { title: `รายงานเหตุการณ์: ${alert.title || 'ไม่ระบุ'}`, blocks: [] };
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a professional incident report draft for:
          Alert Title: ${alert.title}
          Alert Message: ${alert.message}
          Branch: ${branch?.name || 'Unknown'}
          
          JSON Response only with title, isoControlId, classification, standard, and blocks array. 
          Each block must have {id, type, content}. types: h1, h2, paragraph, bullet, todo, ai-insight.`,
      config: { responseMimeType: 'application/json' },
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Failed to generate report from alert:', error);
    return { title: `รายงานเหตุการณ์: ${alert.title || 'ไม่ระบุ'}`, blocks: [] };
  }
};

export const runComplianceAudit = async (
  content: string,
  standard: ISOStandard
): Promise<{ score: number; findings: string[]; recommendations: string[] }> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Audit this report against ${standard}. 
        Report: ${content}
        JSON Response: { "score": number (0-100), "findings": string[], "recommendations": string[] }`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          findings: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
  });
  return JSON.parse(response.text || '{}');
};

export const getIsoContext = async (
  text: string,
  standard: ISOStandard
): Promise<{ clauses: { code: string; title: string; relevance: string }[] }> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this text segment from a facility report. Identify relevant ${standard} clauses that apply.
        Text: "${text}"
        Return JSON: { clauses: [{ code: string, title: string, relevance: string }] } (in Thai)`,
    config: { responseMimeType: 'application/json' },
  });
  return JSON.parse(response.text || '{ "clauses": [] }');
};

export const getWritingSuggestions = async (text: string): Promise<{ suggestions: string[] }> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this text. Suggest 3 short improvements for clarity, tone, or specific detail.
        Text: "${text}"
        Return JSON: { suggestions: string[] } (in Thai)`,
    config: { responseMimeType: 'application/json' },
  });
  return JSON.parse(response.text || '{ "suggestions": [] }');
};

export const enhanceReportContent = async (
  originalText: string,
  instruction: string
): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Instruction: ${instruction}\nText: ${originalText}\nRefine text professionally.`,
  });
  return response.text?.trim() || originalText;
};

export const aiEditorTask = async (
  task: 'improve' | 'shorten' | 'longer' | 'formal' | 'bullet' | 'check',
  text: string
): Promise<string> => {
  const prompts = {
    improve: 'Improve writing quality and fix any errors while maintaining the original meaning.',
    shorten: 'Make this text more concise and shorter while keeping the key information.',
    longer: 'Expand this text with more professional detail and context.',
    formal: 'Rewrite this text to be more formal and professional for an executive report.',
    bullet: 'Rewrite this text as a clear bulleted list of points.',
    check: 'Check this text for technical accuracy and professional terminology.',
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `${prompts[task]}\n\nText: ${text}`,
  });
  return response.text?.trim() || text;
};

export const chatWithDocument = async (
  documentContent: string,
  userMessage: string
): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Context: You are an expert auditor analyzing a facility report.
        Report Content: "${documentContent.substring(0, 10000)}..."
        
        User Question: ${userMessage}
        
        Answer concisely and professionally in Thai based ONLY on the report content provided.`,
  });
  return response.text || 'ไม่สามารถตอบคำถามได้ในขณะนี้';
};

export const summarizeReport = async (reportContent: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Summarize for Executive Board: ${reportContent}`,
  });
  return response.text || 'Summary failed.';
};

export const analyzeBatteryHealth = async (data: any): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analyze health for battery unit: ${JSON.stringify(data)}. Provide detailed summary and proactive recommendations.`,
  });
  return response.text || 'Analysis failed.';
};

export const analyzeLocation = async (
  query: string,
  lat: number,
  lng: number
): Promise<{ text: string; chunks?: any[] }> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Audit energy potential at ${lat}, ${lng}. ${query}`,
    config: { tools: [{ googleSearch: {} }] },
  });
  return {
    text: response.text || 'Analysis failed.',
    chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
  };
};
