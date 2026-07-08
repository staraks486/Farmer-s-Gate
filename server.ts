import express from "express";
import path from "path";
import compression from "compression";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const STORES_FILE = path.join(process.cwd(), "stores.json");
const VERSION_FILE = path.join(process.cwd(), "app_version.json");

function initFiles() {
  if (!fs.existsSync(VERSION_FILE)) {
    fs.writeFileSync(VERSION_FILE, JSON.stringify({ version: "2.3.0" }, null, 2));
  }
  if (!fs.existsSync(STORES_FILE)) {
    const defaultStores = [
      {
        id: 'store-1',
        name: "Farmer's Gate - Mumbai Bandra",
        location: "Bandra West, Link Road, Mumbai",
        whatsappNumber: "919876543210",
        isActive: true,
        createdAt: new Date().toISOString(),
        password: "bandra123",
        version: 1
      },
      {
        id: 'store-2',
        name: "Farmer's Gate - Delhi Karol Bagh",
        location: "Karol Bagh Metro Stn, New Delhi",
        whatsappNumber: "919876543211",
        isActive: true,
        createdAt: new Date().toISOString(),
        password: "karol123",
        version: 1
      },
      {
        id: 'store-3',
        name: "Farmer's Gate - Bangalore Indiranagar",
        location: "100 Feet Rd, Indiranagar, Bangalore",
        whatsappNumber: "919876543212",
        isActive: true,
        createdAt: new Date().toISOString(),
        password: "indira123",
        version: 1
      }
    ];
    fs.writeFileSync(STORES_FILE, JSON.stringify(defaultStores, null, 2));
  }
}

function incrementAppVersion() {
  try {
    let currentVersion = "2.3.0";
    if (fs.existsSync(VERSION_FILE)) {
      const data = JSON.parse(fs.readFileSync(VERSION_FILE, "utf-8"));
      currentVersion = data.version || "2.3.0";
    }
    const parts = currentVersion.replace(/^v/, "").split(".");
    if (parts.length === 3) {
      const patch = parseInt(parts[2], 10);
      if (!isNaN(patch)) {
        parts[2] = (patch + 1).toString();
      } else {
        parts[2] = "1";
      }
    } else {
      parts.push("1");
    }
    const nextVersion = parts.join(".");
    fs.writeFileSync(VERSION_FILE, JSON.stringify({ version: nextVersion }, null, 2));
    console.log(`App version incremented from ${currentVersion} to ${nextVersion}`);
    return nextVersion;
  } catch (err) {
    console.error("Error incrementing app version:", err);
    return "2.3.1";
  }
}

initFiles();

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

  // GET /api/app-version
  app.get("/api/app-version", (req, res) => {
    try {
      let version = "2.3.0";
      if (fs.existsSync(VERSION_FILE)) {
        const data = JSON.parse(fs.readFileSync(VERSION_FILE, "utf-8"));
        version = data.version || "2.3.0";
      }
      res.json({ version });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to read app version" });
    }
  });

  // GET /api/stores
  app.get("/api/stores", (req, res) => {
    try {
      initFiles();
      const data = JSON.parse(fs.readFileSync(STORES_FILE, "utf-8"));
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load stores" });
    }
  });

  // POST /api/stores (Create new store)
  app.post("/api/stores", (req, res) => {
    try {
      initFiles();
      const newStore = req.body;
      if (!newStore.name) {
        return res.status(400).json({ error: "Store name is required" });
      }
      
      const stores = JSON.parse(fs.readFileSync(STORES_FILE, "utf-8"));
      // Generate a unique ID if not provided
      if (!newStore.id) {
        newStore.id = `store-${Date.now()}`;
      }
      newStore.version = 1;
      newStore.createdAt = newStore.createdAt || new Date().toISOString();
      
      stores.push(newStore);
      fs.writeFileSync(STORES_FILE, JSON.stringify(stores, null, 2));
      
      // Increment app version on every modification
      const nextVer = incrementAppVersion();
      
      res.json({ success: true, store: newStore, appVersion: nextVer });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to create store: " + err.message });
    }
  });

  // PUT /api/stores/:id (Update existing store)
  app.put("/api/stores/:id", (req, res) => {
    try {
      initFiles();
      const storeId = req.params.id;
      const updatedFields = req.body;
      
      const stores = JSON.parse(fs.readFileSync(STORES_FILE, "utf-8"));
      const index = stores.findIndex((s: any) => s.id === storeId);
      if (index === -1) {
        return res.status(404).json({ error: "Store not found" });
      }
      
      const existingStore = stores[index];
      const updatedStore = {
        ...existingStore,
        ...updatedFields,
        version: (existingStore.version || 0) + 1
      };
      
      stores[index] = updatedStore;
      fs.writeFileSync(STORES_FILE, JSON.stringify(stores, null, 2));
      
      // Increment app version on every modification
      const nextVer = incrementAppVersion();
      
      res.json({ success: true, store: updatedStore, appVersion: nextVer });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update store: " + err.message });
    }
  });

  // DELETE /api/stores/:id (Delete store)
  app.delete("/api/stores/:id", (req, res) => {
    try {
      initFiles();
      const storeId = req.params.id;
      
      const stores = JSON.parse(fs.readFileSync(STORES_FILE, "utf-8"));
      const filtered = stores.filter((s: any) => s.id !== storeId);
      
      if (stores.length === filtered.length) {
        return res.status(404).json({ error: "Store not found" });
      }
      
      fs.writeFileSync(STORES_FILE, JSON.stringify(filtered, null, 2));
      
      // Increment app version on every modification
      const nextVer = incrementAppVersion();
      
      res.json({ success: true, appVersion: nextVer });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete store: " + err.message });
    }
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
