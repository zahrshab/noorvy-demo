import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route to check server configuration
  app.get("/api/config", (req, res) => {
    res.json({
      hasPythonUrl: !!process.env.PYTHON_SERVER_URL,
    });
  });

  app.post("/api/python/fit", async (req, res) => {
    const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL;
    if (!PYTHON_SERVER_URL) {
      return res.status(400).json({ error: "PYTHON_SERVER_URL not configured in secrets" });
    }

    try {
      const response = await fetch(`${PYTHON_SERVER_URL}/fit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      
      if (!response.ok) throw new Error(`Python server error: ${response.statusText}`);
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: `Failed to reach Python server: ${error.message}` });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
