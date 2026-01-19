import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  try {
    const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : undefined;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.warn("Environment check failed or API key missing", e);
    return null;
  }
};

export const explainMathWithGemini = async (expression: string, result: string): Promise<string> => {
  const client = getClient();
  if (!client) {
    return "Please configure your Gemini API Key to use the Math Tutor feature.";
  }

  try {
    const model = client.models;
    const prompt = `
      You are a helpful math tutor. The user entered the expression "${expression}" which resulted in "${result}".
      Briefly explain how this result is calculated in 1-2 sentences. If it's a simple calculation, just give a fun math fact related to the number.
    `;

    const response = await model.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Could not generate an explanation.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I couldn't connect to the AI tutor right now.";
  }
};