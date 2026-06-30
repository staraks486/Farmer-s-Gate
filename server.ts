import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  
  // Third-party hosts (Heroku, Render, AWS, etc.) dynamically assign PORT via process.env.PORT.
  // We fall back to 3000 for local environment and AI Studio compatibility.
  const PORT = process.env.PORT || 3000;

  // Simple API health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Integrates Vite middleware in development mode to support fast development.
  // In production, serves the pre-compiled production build inside the dist/ directory.
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
