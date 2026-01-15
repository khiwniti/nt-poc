
import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, AIResponse, Branch, Alert, ReportDocument, ReportBlock, ISOStandard } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const sendChatMessage = async (
  message: string,
  history: ChatMessage[],
  context: any
): Promise<AIResponse> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
        { role: 'user', parts: [{ text: `You are an NT AIOps Assistant for a 3D Facility Management Platform.
            User Message: ${message}.
            Standard focus: ISO 27001 (Security), ISO 22301 (Business Continuity), ISO 50001 (Energy Management).
            Respond professionally in Thai.` }] }
    ],
    config: { temperature: 0.7 }
  });

  const text = response.text || "ขออภัยครับ";
  const lower = message.toLowerCase();
  const actions: any[] = [];
  
  if (lower.includes('รายงาน') || lower.includes('report')) {
      actions.push({ type: 'CHANGE_VIEW', payload: 'reports' });
  }

  return { text, actions };
};

export const generateReportDraft = async (prompt: string, standard: ISOStandard = 'ISO-27001'): Promise<Partial<ReportDocument>> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a professional report draft for: "${prompt}".
        Standard: ${standard}. 
        JSON Response only with title, isoControlId, classification, and blocks array. 
        Each block must have {id, type, content}. types: h1, h2, paragraph, bullet, todo, ai-insight.`,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
};

export const generateReportFromAlert = async (alert: Alert, branch?: Branch): Promise<Partial<ReportDocument>> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a professional incident report draft for:
        Alert Title: ${alert.title}
        Alert Message: ${alert.message}
        Branch: ${branch?.name || 'Unknown'}
        
        JSON Response only with title, isoControlId, classification, standard, and blocks array. 
        Each block must have {id, type, content}. types: h1, h2, paragraph, bullet, todo, ai-insight.`,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
};

export const runComplianceAudit = async (content: string, standard: ISOStandard): Promise<{ score: number, findings: string[], recommendations: string[] }> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Audit this report against ${standard}. 
        Report: ${content}
        JSON Response: { "score": number (0-100), "findings": string[], "recommendations": string[] }`,
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.NUMBER },
                    findings: { type: Type.ARRAY, items: { type: Type.STRING } },
                    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
};

export const getIsoContext = async (text: string, standard: ISOStandard): Promise<{ clauses: { code: string, title: string, relevance: string }[] }> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this text segment from a facility report. Identify relevant ${standard} clauses that apply.
        Text: "${text}"
        Return JSON: { clauses: [{ code: string, title: string, relevance: string }] } (in Thai)`,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{ \"clauses\": [] }");
};

export const getWritingSuggestions = async (text: string): Promise<{ suggestions: string[] }> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this text. Suggest 3 short improvements for clarity, tone, or specific detail.
        Text: "${text}"
        Return JSON: { suggestions: string[] } (in Thai)`,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{ \"suggestions\": [] }");
};

export const enhanceReportContent = async (originalText: string, instruction: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Instruction: ${instruction}\nText: ${originalText}\nRefine text professionally.`
    });
    return response.text?.trim() || originalText;
};

export const aiEditorTask = async (task: 'improve' | 'shorten' | 'longer' | 'formal' | 'bullet' | 'check', text: string): Promise<string> => {
    const prompts = {
        improve: "Improve writing quality and fix any errors while maintaining the original meaning.",
        shorten: "Make this text more concise and shorter while keeping the key information.",
        longer: "Expand this text with more professional detail and context.",
        formal: "Rewrite this text to be more formal and professional for an executive report.",
        bullet: "Rewrite this text as a clear bulleted list of points.",
        check: "Check this text for technical accuracy and professional terminology."
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${prompts[task]}\n\nText: ${text}`,
    });
    return response.text?.trim() || text;
};

export const chatWithDocument = async (documentContent: string, userMessage: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Context: You are an expert auditor analyzing a facility report.
        Report Content: "${documentContent.substring(0, 10000)}..."
        
        User Question: ${userMessage}
        
        Answer concisely and professionally in Thai based ONLY on the report content provided.`
    });
    return response.text || "ไม่สามารถตอบคำถามได้ในขณะนี้";
};

export const summarizeReport = async (reportContent: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Summarize for Executive Board: ${reportContent}`
    });
    return response.text || "Summary failed.";
};

export const analyzeBatteryHealth = async (data: any): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze health for battery unit: ${JSON.stringify(data)}. Provide detailed summary and proactive recommendations.`,
    });
    return response.text || "Analysis failed.";
};

export const analyzeLocation = async (query: string, lat: number, lng: number): Promise<{ text: string; chunks?: any[] }> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Audit energy potential at ${lat}, ${lng}. ${query}`,
        config: { tools: [{ googleSearch: {} }] }
    });
    return { 
        text: response.text || "Analysis failed.",
        chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
};
