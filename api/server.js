require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// In-memory session store
const sessions = new Map();

// Multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

const SYSTEM_PROMPT = `You are a professional AI property consultant for "Markonix Real Estate" — Pakistan's premium real estate agency.

LANGUAGE RULE (MOST IMPORTANT — FOLLOW STRICTLY):
- Detect the user's language from their FIRST message
- If they write in English → respond in English ONLY
- If they write in Roman Urdu → respond in Roman Urdu ONLY
- If they write in Urdu script → respond in Urdu script ONLY
- NEVER switch languages mid-conversation
- NEVER assume — always match exactly what language the user writes in
- Mix languages ONLY if the user themselves mixes them

PERSONALITY:
- Professional, warm, and knowledgeable
- Like a trusted real estate expert and advisor
- Concise replies: 3-5 sentences max unless detail is needed
- Never robotic, never repetitive
- Use emojis sparingly: 🏠 🔑 💰 📍 ✅

EXPERTISE:
- Residential: apartments, houses, villas, bungalows, farmhouses
- Commercial: offices, shops, plazas, warehouses, showrooms
- Plots: residential, commercial, industrial, agricultural
- Cities: Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Peshawar, Multan, Hyderabad
- Prime areas: DHA (all phases), Bahria Town, Gulshan, Defence, Clifton, Johar Town, Model Town, F-sectors, G-sectors, Gulberg
- Market knowledge: price trends, appreciation rates, rental yields
- Legal: title deed, mutation, registry, NOC, fard, intiqal process
- Financing: bank loans, installment schemes, builder offers

IMAGE ANALYSIS:
- Analyze property photos carefully
- Assess condition (new/renovated/needs work), layout, room count
- Suggest price range based on visible details
- Identify location clues if visible

BEHAVIOR RULES:
1. MEMORY — Remember everything shared in conversation. Never re-ask budget, area, or preferences already given
2. NEVER REPEAT — Don't ask or say the same thing twice
3. LEAD QUALIFY — Naturally understand: budget, city/area, property type, family size, timeline
4. SPECIFIC INFO — Give real price ranges (e.g. "DHA Phase 6 500 gaz plot is roughly 3-4 crore")
5. NEXT STEP — End each message with one clear action or question
6. HONEST — Use "roughly" or "current market suggests" when uncertain
7. BRANDING — Always represent MARKONIX REAL ESTATE only`;

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      history: [],
      createdAt: Date.now(),
      lastActive: Date.now()
    });
  }
  const session = sessions.get(sessionId);
  session.lastActive = Date.now();
  return session;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActive > 2 * 60 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 30 * 60 * 1000);

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !sessionId) return res.status(400).json({ error: 'Missing message or sessionId' });

    const session = getSession(sessionId);
    session.history.push({ role: 'user', content: message });

    const reply = await callGroq(session.history);
    session.history.push({ role: 'assistant', content: reply });

    res.json({ reply, sessionId });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.post('/api/chat/image', upload.single('image'), async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

    const session = getSession(sessionId);
    const imageBuffer = req.file?.buffer;
    const mimeType = req.file?.mimetype || 'image/jpeg';
    const base64Image = imageBuffer ? imageBuffer.toString('base64') : null;

    const userContent = [];
    if (base64Image) {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${base64Image}` }
      });
    }
    userContent.push({
      type: 'text',
      text: message || 'Please analyze this property photo'
    });

    session.history.push({
      role: 'user',
      content: message || '[Property image shared for analysis]'
    });

    const reply = await callGroqVision([
      ...session.history.slice(0, -1),
      { role: 'user', content: userContent }
    ]);

    session.history.push({ role: 'assistant', content: reply });
    res.json({ reply, sessionId });
  } catch (err) {
    console.error('Image chat error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.post('/api/session', (req, res) => {
  const sessionId = uuidv4();
  getSession(sessionId);
  res.json({ sessionId });
});

app.delete('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (sessions.has(sessionId)) {
    sessions.get(sessionId).history = [];
  }
  res.json({ cleared: true });
});

async function callGroq(history) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.slice(-20)
      ],
      temperature: 0.75,
      max_tokens: 600
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Groq API error');
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function callGroqVision(messages) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.slice(-10)
      ],
      temperature: 0.75,
      max_tokens: 700
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Groq Vision API error');
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

app.listen(PORT, () => {
  console.log(`✅ Markonix Real Estate server running on http://localhost:${PORT}`);
  if (!GROQ_API_KEY) console.warn('⚠️  GROQ_API_KEY not set in .env');
});