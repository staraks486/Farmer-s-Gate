import express from "express";
import path from "path";
import compression from "compression";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const STORES_FILE = path.join(process.cwd(), "stores.json");
const VERSION_FILE = path.join(process.cwd(), "app_version.json");
const GITHUB_SYNC_FILE = path.join(process.cwd(), "github_sync.json");

function initFiles() {
  if (!fs.existsSync(VERSION_FILE)) {
    fs.writeFileSync(VERSION_FILE, JSON.stringify({ version: "2.3.0" }, null, 2));
  }
  if (!fs.existsSync(STORES_FILE)) {
    fs.writeFileSync(STORES_FILE, JSON.stringify([], null, 2));
  }
}

async function pushToGithub(token: string, repoName: string, isPrivate: boolean) {
  // 1. Create or get repository via GitHub API
  const createRepoRes = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Farmers-Gate-App'
    },
    body: JSON.stringify({
      name: repoName,
      private: isPrivate,
      auto_init: false
    })
  });
  
  let repoData = await createRepoRes.json();
  
  // If it already exists (422), fetch the existing repository details
  if (!createRepoRes.ok && repoData.errors?.[0]?.message === 'name already exists on this account') {
    const getRepoRes = await fetch(`https://api.github.com/user`, { headers: { Authorization: `Bearer ${token}` }});
    const user = await getRepoRes.json();
    const getSpecificRepoRes = await fetch(`https://api.github.com/repos/${user.login}/${repoName}`, { headers: { Authorization: `Bearer ${token}` }});
    repoData = await getSpecificRepoRes.json();
  } else if (!createRepoRes.ok) {
    throw new Error(repoData.message || 'Failed to create repository');
  }

  const cloneUrl = repoData.clone_url;
  // Inject token into the clone URL for git authentication
  const authUrl = cloneUrl.replace('https://', `https://x-access-token:${token}@`);
  
  // 2. Commit and push the workspace
  try {
    await execAsync(`git config --global user.name "AI Builder" || git config user.name "AI Builder"`);
    await execAsync(`git config --global user.email "ai@example.com" || git config user.email "ai@example.com"`);
  } catch(e) {} // ignore config errors

  // Force completely fresh git repository to avoid corrupted index errors
  await execAsync(`rm -rf .git`);
  await execAsync(`git init`);
  
  await execAsync(`git add .`);
  try {
    await execAsync(`git commit -m "Auto-update from Farmer's Gate App"`);
  } catch(e) {
    // If there's nothing to commit, that's fine
  }
  
  await execAsync(`git remote remove origin || true`);
  await execAsync(`git remote add origin ${authUrl}`);
  // Push to existing branch (usually master or main), we will push to main and master to be safe or parse default branch
  const branch = repoData.default_branch || 'main';
  try {
    await execAsync(`git push -u origin HEAD:${branch} --force`);
  } catch (err: any) {
    console.error(`Failed to push to ${branch}, trying fallback branch...`, err.message);
    const fallbackBranch = `update-${Date.now()}`;
    await execAsync(`git push -u origin HEAD:${fallbackBranch} --force`);
    return `${repoData.html_url}/tree/${fallbackBranch}`;
  }
  
  return repoData.html_url;
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
    
    // Check if auto-sync to github is enabled
    if (fs.existsSync(GITHUB_SYNC_FILE)) {
      try {
        const syncData = JSON.parse(fs.readFileSync(GITHUB_SYNC_FILE, "utf-8"));
        if (syncData.enabled && syncData.token && syncData.repoName) {
          console.log("Auto-syncing to GitHub...");
          pushToGithub(syncData.token, syncData.repoName, syncData.isPrivate)
            .then(url => console.log(`Auto-synced to ${url}`))
            .catch(err => console.error("Auto-sync to GitHub failed:", err));
        }
      } catch (e) {
        console.error("Error reading github sync config:", e);
      }
    }
    
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

  // POST /api/app-version/increment (Frontend-driven app version increment)
  app.post("/api/app-version/increment", (req, res) => {
    try {
      const nextVer = incrementAppVersion();
      res.json({ success: true, version: nextVer });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to increment app version on backend: " + err.message });
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
      
      // If ID is provided, check for existing store to avoid duplicates
      if (newStore.id) {
        const existingIndex = stores.findIndex((s: any) => s.id === newStore.id);
        if (existingIndex !== -1) {
          // If it exists, we treat it as an update or just return success if it's identical
          // But usually POST should be for new. Here we'll just return error or handle it.
          // Let's return error to be strict.
          return res.status(400).json({ error: "Store with this ID already exists" });
        }
      } else {
        // Generate a unique ID if not provided
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

  // --- GitHub OAuth Integration ---
  
  function getGithubRedirectUri(req: any) {
    if (process.env.APP_URL) {
      return `${process.env.APP_URL}/auth/github/callback`;
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${protocol}://${host}/auth/github/callback`;
  }

  // GET /api/auth/github/url
  app.get('/api/auth/github/url', (req, res) => {
    const redirectUri = getGithubRedirectUri(req);
    const clientId = process.env.GITHUB_CLIENT_ID;
    
    if (!clientId) {
      return res.status(500).json({ error: "GITHUB_CLIENT_ID is not configured. Please add it in Settings > Secrets." });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email repo', // Adjust scopes as needed
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    res.json({ url: authUrl });
  });

  // GET /auth/github/callback
  app.get(['/auth/github/callback', '/auth/github/callback/'], async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("No authorization code provided");
    }

    const redirectUri = getGithubRedirectUri(req);
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).send("GitHub client ID or secret not configured.");
    }

    try {
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code.toString(),
          redirect_uri: redirectUri
        })
      });

      const tokenData = await tokenResponse.json();
      
      // Sending token to parent window via postMessage
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  provider: 'github',
                  access_token: '${tokenData.access_token || ''}' 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("GitHub OAuth Error:", err);
      res.status(500).send("GitHub Authentication failed.");
    }
  });

  // POST /api/auth/github/export
  app.post('/api/auth/github/export', async (req, res) => {
    const { token, repoName, isPrivate } = req.body;
    if (!token || !repoName) {
      return res.status(400).json({ error: 'Missing token or repository name.' });
    }

    try {
      const url = await pushToGithub(token, repoName, isPrivate);
      res.json({ success: true, url });
    } catch (err: any) {
      console.error("GitHub Export Error:", err);
      res.status(500).json({ error: err.message || 'Failed to export code' });
    }
  });

  // GET /api/auth/github/auto-sync
  app.get('/api/auth/github/auto-sync', (req, res) => {
    try {
      if (fs.existsSync(GITHUB_SYNC_FILE)) {
        const syncData = JSON.parse(fs.readFileSync(GITHUB_SYNC_FILE, "utf-8"));
        // Don't send the full token back, just a boolean indicator
        res.json({
          enabled: syncData.enabled || false,
          repoName: syncData.repoName || "",
          isPrivate: syncData.isPrivate || false,
          hasToken: !!syncData.token
        });
      } else {
        res.json({ enabled: false, repoName: "", isPrivate: false, hasToken: false });
      }
    } catch (err: any) {
      res.status(500).json({ error: "Failed to read sync config" });
    }
  });

  // POST /api/auth/github/auto-sync
  app.post('/api/auth/github/auto-sync', (req, res) => {
    try {
      const { enabled, token, repoName, isPrivate } = req.body;
      
      let syncData: any = {};
      if (fs.existsSync(GITHUB_SYNC_FILE)) {
        try {
          syncData = JSON.parse(fs.readFileSync(GITHUB_SYNC_FILE, "utf-8"));
        } catch (e) {}
      }
      
      syncData.enabled = !!enabled;
      if (repoName !== undefined) syncData.repoName = repoName;
      if (isPrivate !== undefined) syncData.isPrivate = isPrivate;
      if (token) syncData.token = token; // Update token only if provided
      
      fs.writeFileSync(GITHUB_SYNC_FILE, JSON.stringify(syncData, null, 2));
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save sync config" });
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
      index: false
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
