import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY!;

// Initialize new SDK
const genAI = new GoogleGenAI({
  apiKey,
});

// Same model
const model = "gemini-3-flash-preview";

// Same generation config
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

// SAME FLOW like old chatSession
export const chatSession = {
  async sendMessage(message: string) {
    try {
      const response = await genAI.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ text: message }],
          },
        ],
        config: {
          ...generationConfig,
        },
      });

      // text() is a method in Gemini SDK that returns the text content
      if (!response?.text) {
        throw new Error("No text response from Gemini API");
      }

      const responseText = response.text;
      
      return responseText;
    } catch (error) {
      console.error("Gemini Error:", error);
      throw error; // Re-throw to let caller handle it
    }
  },
};