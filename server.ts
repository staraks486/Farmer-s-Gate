import express from "express";
import path from "path";
import compression from "compression";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

let geminiClient: any = null;

function getGeminiClient() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please configure it in Settings > Secrets.");
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

async function startServer() {
  const app = express();
  
  // Configure body limit to handle high-resolution image uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Enable standard compression middleware to optimize network transfer sizes
  app.use(compression());
  
  // Third-party hosts (Heroku, Render, AWS, etc.) dynamically assign PORT via process.env.PORT.
  // We fall back to 3000 for local environment and AI Studio compatibility.
  const PORT = process.env.PORT || 3000;

  // Simple API health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API endpoint for parsing stock invoices, delivery notes, or produce images via Gemini AI
  app.post("/api/gemini/parse-image", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Missing image data" });
      }

      // Initialize Gemini Client lazily to prevent server crashing on start if API key isn't provided yet
      const ai = getGeminiClient();

      // Clean base64 prefix if present
      const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: cleanBase64,
              },
            },
            {
              text: "Extract a list of produce items or stock items from this image, document, delivery receipt, or invoice. For each item, find the crop/produce name, the quantity in kilograms (kg) or pieces, and optionally the cost price and selling price if specified or identifiable. Standardize the produce names to match general crops if applicable (e.g. 'Tomatoes (Tamatar)', 'Potatoes (Aloo)', 'Onions (Pyaz)', 'Spinach (Palak)', 'Carrot (Gajar)', 'Ginger (Adrak)', 'Garlic (Lahsun)')."
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                cropName: { type: Type.STRING, description: "Identified standard crop name" },
                quantity: { type: Type.NUMBER, description: "Quantity of stock in kilograms (kg) or units" },
                costPrice: { type: Type.NUMBER, description: "Unit cost price in INR (₹) if available" },
                sellingPrice: { type: Type.NUMBER, description: "Unit selling price in INR (₹) if available" }
              },
              required: ["cropName", "quantity"]
            }
          }
        }
      });

      const resultText = response.text;
      res.json({ success: true, data: JSON.parse(resultText || "[]") });
    } catch (err: any) {
      console.error("Gemini Image Parsing Error:", err);
      res.status(500).json({ error: err.message || "Failed to analyze image with Gemini AI." });
    }
  });

  // Integrates Vite middleware in development mode to support fast development.
  // In production, serves the pre-compiled production build inside the dist/ directory with caching headers.
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Cache static assets (JS, CSS, images) for 1 day to make repeat page loads near-instantaneous
    app.use(express.static(distPath, {
      maxAge: '1d',
      etag: true,
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
