/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import compression from "compression";
import { db } from "./src/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

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
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, String(v)));
        } else {
          params.append(key, String(value));
        }
      }
      const query = params.toString();
      const targetUrl = `https://dadosabertos.camara.leg.br/api/v2/${endpoint}${query ? '?' + query : ''}`;
      
      // Cache logic - 24h for votacoes/proposicoes, 10m for others
      const isDeputyData = endpoint.includes('/votacoes') || endpoint.includes('/proposicoes') || endpoint.includes('/despesas');
      const ttl = isDeputyData ? 24 * 60 * 60 * 1000 : CACHE_TTL;

      if (apiCache.has(targetUrl)) {
        const cached = apiCache.get(targetUrl)!;
        if (Date.now() - cached.timestamp < ttl) {
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

  // API Proxy Route for Senado API
  app.get("/api/senado/*", async (req, res) => {
    try {
      const endpoint = req.params[0];
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, String(v)));
        } else {
          params.append(key, String(value));
        }
      }
      const query = params.toString();
      
      // We'll try the .json version first as it's the standard for our app
      const finalEndpoint = endpoint.includes('.') ? endpoint : `${endpoint}.json`;
      const targetUrl = `https://legis.senado.leg.br/dadosabertos/api/${finalEndpoint}${query ? '?' + query : ''}`;
      
      console.log(`[Senado Proxy] Fetching: ${targetUrl}`);
      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        // Fallback: some endpoints might not like .json explicitly if it's already a complex path
        if (!endpoint.includes('.')) {
            const fallbackUrl = `https://legis.senado.leg.br/dadosabertos/api/${endpoint}${query ? '?' + query : ''}`;
            console.log(`[Senado Proxy] Fallback Attempt: ${fallbackUrl}`);
            const fallbackRes = await fetch(fallbackUrl, {
                headers: { 'Accept': 'application/json' }
            });
            if (fallbackRes.ok) {
                const data = await fallbackRes.json();
                return res.json(data);
            }
        }
        return res.status(response.status).json({ error: "Upstream Senado API error" });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Senado Proxy Error:", error);
      res.status(500).json({ error: "Internal Senado Proxy Error" });
    }
  });

  // AUDIO GENERATION ENDPOINT
  app.post("/api/deputados/:id/audio", async (req, res) => {
    try {
      const { id } = req.params;
      const { script } = req.body; 
      const cacheId = `audio_v1_${id}`;

      // 1. Check Cache (Firestore)
      const cachedRef = doc(db, 'ai_cache', cacheId);
      const cachedSnap = await getDoc(cachedRef);
      
      if (cachedSnap.exists()) {
        const data = cachedSnap.data() as any;
        const age = Date.now() - (data.updatedAt?.seconds * 1000 || Date.now());
        if (age < 7 * 24 * 60 * 60 * 1000) {
          return res.json({ audioUrl: data.audioBase64, cached: true });
        }
      }

      // If no cache and no script, tell frontend to generate
      if (!script) {
        return res.json({ cached: false, needsScript: true });
      }

      // 4. Call ElevenLabs
      const voiceId = process.env.ELEVENLABS_VOICE_ID || "zNEsdgTUa3ndwKry8Xcq";
      const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      
      console.log(`[ElevenLabs] Generating audio for ID: ${id}`);
      const elevenRes = await fetch(elevenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8
          }
        })
      });

      if (!elevenRes.ok) {
        return res.status(500).json({ error: "ElevenLabs Generation Failed" });
      }

      const arrayBuffer = await elevenRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = `data:audio/mpeg;base64,${buffer.toString('base64')}`;

      // 5. Save to Cache
      await setDoc(cachedRef, {
        audioBase64: base64,
        script: script,
        updatedAt: serverTimestamp()
      });

      res.json({ audioUrl: base64 });
    } catch (error: any) {
      console.error("Audio API Error:", error);
      res.status(500).json({ error: "Failed to generate audio summary" });
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
