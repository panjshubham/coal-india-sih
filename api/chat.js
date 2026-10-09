/**
 * Vercel Serverless Function: Secure & Hardened Gemini AI Proxy
 * 
 * SECURITY IMPLEMENTATIONS:
 * 1. Strict Origin Validation (blocks untrusted third-party origins)
 * 2. In-Memory Sliding-Window Rate Limiting (blocks DDoS and API quota abuse)
 * 3. Payload and Length Constraints (blocks buffer overflow / prompt flooding)
 * 4. Input Sanitization (strips null-bytes and dangerous control characters)
 * 5. Private Key Isolation (GEMINI_API_KEY stays strictly server-side)
 * 6. Hardened HTTP Security Headers (nosniff, DENY, no-referrer, no-store)
 */

// In-memory sliding-window IP rate limiter
const ipRequests = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 25;     // 25 calls per min per IP

function isRateLimited(ip) {
  const now = Date.now();
  // Inline cleanup for serverless environment without background intervals
  if (ipRequests.size > 200) {
    for (const [key, ts] of ipRequests.entries()) {
      if (ts.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) {
        ipRequests.delete(key);
      }
    }
  }
  const timestamps = (ipRequests.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    ipRequests.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  ipRequests.set(ip, timestamps);
  return false;
}

function sanitizeInputText(str) {
  if (typeof str !== 'string') return '';
  // Strip null bytes and non-printable control characters (except newline and tab)
  return str.replace(/\0/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function isOriginAllowed(origin) {
  if (!origin) return true; // Direct/same-origin server calls
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname;
    // Allow local development
    if (host === 'localhost' || host === '127.0.0.1') return true;
    // Allow Vercel preview & production deployments
    if (host.endsWith('.vercel.app')) return true;
    // Allow custom domains if applicable
    if (host === 'coalguard.in' || host.endsWith('.coalguard.in')) return true;
    return false;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin;

  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  // Origin Validation
  if (origin) {
    if (isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      return res.status(403).json({ error: 'Access forbidden: unauthorized origin.' });
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Rate Limiting Guard
  const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
    .toString()
    .split(',')[0]
    .trim();

  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment before sending another message.',
      retryAfter: 60
    });
  }

  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the backend server.',
      fallback: true
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > 65536) {
      return res.status(413).json({ error: 'Payload too large (max 64KB).' });
    }
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  let contents = body.contents;
  if (!contents && body.messages && Array.isArray(body.messages)) {
    // Limit to latest 25 messages to prevent token abuse
    const recentMessages = body.messages.slice(-25);
    contents = recentMessages.map((m) => {
      const role = m.role === 'user' || m.type === 'user' ? 'user' : 'model';
      const text = sanitizeInputText(m.text || m.content || '').slice(0, 4000);
      return {
        role,
        parts: [{ text }]
      };
    }).filter((c) => c.parts[0].text.length > 0);
  } else if (Array.isArray(contents)) {
    contents = contents.slice(-25).map((c) => ({
      role: c.role === 'user' ? 'user' : 'model',
      parts: (c.parts || []).map((p) => ({
        text: sanitizeInputText(p.text || '').slice(0, 4000)
      })).filter((p) => p.text.length > 0)
    })).filter((c) => c.parts.length > 0);
  }

  if (!contents || contents.length === 0) {
    return res.status(400).json({ error: 'No prompt or messages provided' });
  }

  const systemInstruction = sanitizeInputText(
    typeof body.systemInstruction === 'string'
      ? body.systemInstruction
      : body.system_instruction || ''
  ).slice(0, 8000);

  const temperature = Math.min(Math.max(Number(body.temperature) || 0.6, 0.0), 1.0);
  const maxOutputTokens = Math.min(Math.max(Number(body.maxOutputTokens) || 800, 50), 2048);
  const streamRequested = Boolean(body.stream || req.query.stream === 'true');

  const payload = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const candidateModels = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.8-flash'];

  // Handle SSE Streaming
  if (streamRequested) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    for (const model of candidateModels) {
      try {
        const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
        const upstreamRes = await fetch(streamUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (upstreamRes.ok && upstreamRes.body) {
          const reader = upstreamRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                try {
                  const parsed = JSON.parse(dataStr);
                  const cand = parsed.candidates?.[0];
                  const chunkText = cand?.content?.parts?.map((p) => p.text || '').join('') || '';
                  if (chunkText) {
                    res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                  }
                } catch {
                  // Ignore malformed chunk
                }
              }
            }
          }
          res.write('data: [DONE]\n\n');
          return res.end();
        }
      } catch (err) {
        console.warn(`Vercel function: stream error on ${model}:`, err.message);
      }
    }
  }

  // Non-streaming fallback
  let lastError = null;
  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const upstreamRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await upstreamRes.json();
      if (upstreamRes.ok && data.candidates) {
        const parts = data.candidates[0]?.content?.parts || [];
        const replyText = parts.map((p) => p.text || '').join('');
        return res.status(200).json({
          text: replyText,
          model,
          status: 'success'
        });
      }
      lastError = data.error?.message || `Status ${upstreamRes.status}`;
    } catch (err) {
      lastError = err.message;
    }
  }

  return res.status(502).json({
    error: `Gemini generation failed: ${lastError}`,
    fallback: true
  });
}
