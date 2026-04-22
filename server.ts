/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import compression from "compression";

// Simple in-memory cache for API requests
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(compression());
  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Proxy Route for Camara API
  app.get("/api/camara/*", async (req, res) => {
    try {
      const endpoint = req.params[0];
      const queryArr = Object.entries(req.query).map(([k, v]) => `${k}=${v}`);
      const query = queryArr.join('&');
      const targetUrl = `https://dadosabertos.camara.leg.br/api/v2/${endpoint}${query ? '?' + query : ''}`;
      
      if (apiCache.has(targetUrl)) {
        const cached = apiCache.get(targetUrl)!;
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          return res.json(cached.data);
        }
      }

      console.log(`[Proxy] Fetching: ${targetUrl}`);
      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        }
      });
      
      if (!response.ok) return res.status(response.status).json({ error: "Upstream API error" });
      const data = await response.json();
      apiCache.set(targetUrl, { data, timestamp: Date.now() });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Internal Proxy Error" });
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
