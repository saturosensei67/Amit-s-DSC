import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Trust proxy (required for express-rate-limit when behind a proxy like Nginx)
  app.set("trust proxy", 1);

  // Rate Limiting: Prevent abuse (100 requests per 15 minutes)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests from this IP, please try again after 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }, // Suppress the trust proxy validation warning as we've set it
  });

  app.use(cors());
  app.use(express.json());
  app.use("/api/", limiter); // Apply rate limiting to all API routes

  // Helper to get Gemini instance lazily
  let genAI: GoogleGenAI | null = null;
  const getGenAI = () => {
    if (!genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        throw new Error("GEMINI_API_KEY is missing or not configured. Please set it in your environment variables.");
      }
      genAI = new GoogleGenAI({ apiKey });
    }
    return genAI;
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
    res.json({ 
      status: "ok", 
      agent: "Amit's DSC",
      configured: hasKey
    });
  });

  /**
   * AI Agent Endpoint
   * Handles multiple tasks: summarize, insight, classify.
   */
  app.post("/api/agent", async (req, res) => {
    try {
      const { text, task } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Valid input text is required" });
      }

      const ai = getGenAI();
      let systemInstruction = "";
      let responseSchema: any = {};
      let prompt = "";

      switch (task) {
        case "summarize":
          systemInstruction = "You are a summarization agent. Provide a concise summary and key bullet points.";
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["summary", "bulletPoints"]
          };
          prompt = `Summarize this text: ${text}`;
          break;

        case "classify":
          systemInstruction = "You are a classification agent. Categorize the text into appropriate labels.";
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              urgency: { type: Type.STRING, enum: ["low", "medium", "high"] }
            },
            required: ["category", "tags", "urgency"]
          };
          prompt = `Classify this text: ${text}`;
          break;

        case "insight":
        default:
          systemInstruction = "You are a professional Insight Agent. Return valid JSON.";
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              insights: { type: Type.ARRAY, items: { type: Type.STRING } },
              sentiment: { type: Type.STRING, enum: ["positive", "neutral", "negative"] }
            },
            required: ["summary", "insights", "sentiment"]
          };
          prompt = `Analyze this text: ${text}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema
        }
      });

      if (!response.text) {
        throw new Error("Empty response from Gemini API");
      }

      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error("Agent Error:", error);
      
      // Sanitize error message to prevent leaking API key or internal details
      let message = "Failed to process request";
      if (error instanceof Error) {
        if (error.message.includes("GEMINI_API_KEY")) {
          message = "API Key configuration error on server.";
        } else if (error.message.includes("API key not valid")) {
          message = "The provided API key is invalid.";
        } else if (error.message.includes("Too many requests")) {
          message = error.message;
        } else {
          message = error.message;
        }
      }

      res.status(500).json({ error: message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
