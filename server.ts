import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Use JSON parser with a large limit to support base64 payloads if needed
  app.use(express.json({ limit: "10mb" }));

  // Initialize Gemini AI Client (Lazy initialization to prevent crashes if key is missing)
  let aiClient: GoogleGenAI | null = null;
  function getAiClient(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required");
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // --- API ROUTES ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI Image Generation Endpoint
  app.post("/api/generate-image", async (req, res): Promise<any> => {
    try {
      const { prompt, category } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "O prompt é obrigatório." });
      }

      // Format a high-quality prompt for a food item based on category
      const enhancedPrompt = `A professional, mouth-watering high-resolution studio photograph of a food item: ${prompt}. ${
        category ? `Category: ${category}.` : ""
      } Beautiful professional food staging, cinematic studio lighting, blurred background, delicious, highly detailed, photorealistic.`;

      console.log(`Generating image for prompt: "${prompt}" (Enhanced: "${enhancedPrompt}")`);

      const ai = getAiClient();

      // We'll use gemini-3.1-flash-lite-image by default for fast general generation
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: {
          parts: [
            {
              text: enhancedPrompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });

      let base64Image = "";

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            base64Image = part.inlineData.data;
            break;
          }
        }
      }

      if (!base64Image) {
        throw new Error("Não foi possível extrair a imagem gerada da resposta da IA.");
      }

      return res.json({
        success: true,
        imageUrl: `data:image/png;base64,${base64Image}`,
      });
    } catch (error: any) {
      console.error("Erro ao gerar imagem com IA:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Erro interno ao gerar imagem.",
        apiKeyMissing: !process.env.GEMINI_API_KEY,
      });
    }
  });

  // --- VITE / STATIC FILES MIDDLEWARE ---

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
