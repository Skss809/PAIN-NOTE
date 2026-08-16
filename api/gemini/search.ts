import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing on the server.' });
  }

  try {
    const { keyword, notes } = req.body;
    
    if (!keyword || !notes || !Array.isArray(notes)) {
      return res.status(400).json({ error: 'Keyword and notes array are required.' });
    }
    
    const prompt = `You are a smart search assistant. Your task is to find which notes are relevant to the user's search keyword.
Keyword: "${keyword}"

Here are the notes:
${JSON.stringify(notes.map((n: any) => ({ id: n.id, title: n.title, content: n.content })), null, 2)}

Return a list of IDs (strings) for the notes that are relevant to the search keyword. Do not include any other information or reasoning.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const jsonText = response.text || "[]";
    const result = JSON.parse(jsonText);
    res.status(200).json({ results: result });
  } catch (error: any) {
    console.error('Error during Gemini search:', error);
    res.status(500).json({ error: error.message || 'Failed to search notes using Gemini.' });
  }
}
