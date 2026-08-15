// server.ts
import express from "express";
import { createServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
dotenv.config();
var app = express();
app.use(express.json());
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
app.post("/api/gemini/search", async (req, res) => {
  try {
    const { keyword, notes } = req.body;
    if (!keyword || !notes || !Array.isArray(notes)) {
      return res.status(400).json({ error: "Keyword and notes array are required." });
    }
    const prompt = `You are a smart search assistant. Your task is to find which notes are relevant to the user's search keyword.
Keyword: "${keyword}"

Here are the notes:
${JSON.stringify(notes.map((n) => ({ id: n.id, title: n.title, content: n.content })), null, 2)}

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
    res.json({ results: result });
  } catch (error) {
    console.error("Error during Gemini search:", error);
    res.status(500).json({ error: "Failed to search notes using Gemini." });
  }
});
var isProd = process.env.NODE_ENV === "production";
async function startServer() {
  if (!isProd) {
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }
  const port = 3e3;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
startServer();
