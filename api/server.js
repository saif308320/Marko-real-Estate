require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

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

// ─── EMAIL TRANSPORTER ───────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS
  }
});

// ─── SEND LEAD EMAIL ─────────────────────────────────
async function sendLeadEmail(leadData) {
  const { name, phone, city, propertyType, budget, extra } = leadData;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 10px;">
      <div style="background: #c9a84c; padding: 20px; border-radius: 8px; text-align: center;">
        <h1 style="color: #111; margin: 0;">🏠 Markonix Real Estate</h1>
        <p style="color: #111; margin: 5px 0;">New Lead Alert!</p>
      </div>
      <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 15px;">
        <h2 style="color: #333;">Lead Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #666;">👤 Name</td>
            <td style="padding: 10px; color: #333;">${name || 'Not provided'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #666;">📞 Phone</td>
            <td style="padding: 10px; color: #333; font-size: 18px;"><strong>${phone || 'Not provided'}</strong></td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #666;">📍 City</td>
            <td style="padding: 10px; color: #333;">${city || 'Not provided'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #666;">🏠 Property Type</td>
            <td style="padding: 10px; color: #333;">${propertyType || 'Not provided'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-weight: bold; color: #666;">💰 Budget</td>
            <td style="padding: 10px; color: #333;">${budget || 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #666;">📝 Extra Info</td>
            <td style="padding: 10px; color: #333;">${extra || 'None'}</td>
          </tr>
        </table>
      </div>
      <div style="text-align: center; margin-top: 15px; color: #888; font-size: 12px;">
        <p>Markonix Real Estate Bot — ${new Date().toLocaleString('en-PK', {timeZone: 'Asia/Karachi'})}</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Markonix Bot" <${GMAIL_USER}>`,
    to: GMAIL_USER,
    subject: `🔥 New Lead: ${name || 'Unknown'} — ${phone || 'No phone'} — ${city || 'No city'}`,
    html
  });
}

const SYSTEM_PROMPT = `You are a smart, friendly AI property consultant for "Markonix Real Estate" — Pakistan's premium real estate agency.

LANGUAGE RULE (MOST IMPORTANT — STRICT):
- Detect language from user's VERY FIRST message
- If user writes in English → respond in English ONLY, no Urdu words at all
- If user writes in Roman Urdu → respond in Roman Urdu ONLY (use Pakistani style: "ha", "han", "me", "tha" — NEVER Hindi words "hai", "hain", "mein")
- If user writes in Urdu script → respond in Urdu script ONLY
- MATCH EXACTLY — no mixing unless user mixes first
- If user switches language → you switch too immediately

PERSONALITY — BE HUMAN, NOT A ROBOT:
- Warm, friendly, like a trusted dost jo expert bhi ho
- Use humor lightly, be relatable
- Never repeat yourself
- Never sound scripted or salesy
- If client says "expensive" → say "Bhai aapka exact budget batao, main kuch options dhundta hoon"
- If client says "will think" → say "Bilkul sochein, lekin yeh property kaafi demand mein ha, jaldi jaati ha aisi"
- Create soft urgency — never pressure
- Be emotionally intelligent — read between the lines

LEAD CAPTURE FLOW (follow this order naturally):
1. Understand property type (residential/commercial/plot) — MUST ask if not given
2. Ask city and area preference — MUST ask if not given
3. Ask budget range — MUST ask if not given
4. Ask family size or purpose (own use / investment / rental)
5. Ask timeline (kab tak chahiye)
6. Ask name
7. Ask phone number — say "Main aapko personally call karunga aur best options share karunga"

IMPORTANT LEAD RULE:
- NEVER ask for phone number until you have: property type, city, AND budget
- If client asks to book appointment directly → first say "Zaroor! Pehle mujhe thodi info chahiye taake main aapke liye best options ready kar sakoon" → then ask missing info one by one
- Only after getting all 3 (property type + city + budget) → ask name → then phone

PHONE NUMBER DETECTION:
- When user shares a phone number (any format: 03XX, +92XX, 3XXXXXXXXX), extract it
- IMMEDIATELY respond with this EXACT JSON at the END of your message (after normal reply):
[LEAD_CAPTURED]{"name":"client name if known","phone":"number","city":"city if known","propertyType":"type if known","budget":"budget if known","extra":"any other info"}[/LEAD_CAPTURED]
- This JSON will be processed automatically — user will NOT see it

PRICING KNOWLEDGE:
- DHA Karachi Phase 6: 500 gaz plot ~3-4 crore
- Bahria Town Karachi: 125 gaz ~80-90 lakh, 250 gaz ~1.5-2 crore
- Gulshan/Nazimabad apartment 2bed: 80 lakh - 1.5 crore
- DHA Lahore plot 1 kanal: 4-6 crore
- Bahria Town Lahore 10 marla: 1.5-2 crore
- Islamabad F-sector 1 kanal: 8-12 crore
- Always say "roughly" or "current market mein"

OBJECTION HANDLING:
- "Too expensive" → Offer alternatives, ask exact budget
- "Just browsing" → Ask what ideal property would look like
- "Will decide later" → Create soft urgency, offer to send details
- "Bad time" → "Bilkul, main note kar leta hoon aur baad mein connect karta hoon — bas naam aur number de dein"

IMPORTANT:
- Never mention competitor agencies
- Always represent MARKONIX REAL ESTATE
- End every message with one clear next step or question
- Keep replies 3-5 sentences max unless detail needed`;

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      history: [],
      leadCaptured: false,
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

// ─── PROCESS LEAD FROM REPLY ──────────────────────────
async function processLeadFromReply(reply, session) {
  const leadMatch = reply.match(/\[LEAD_CAPTURED\](.*?)\[\/LEAD_CAPTURED\]/s);
  if (leadMatch && !session.leadCaptured) {
    try {
      const leadData = JSON.parse(leadMatch[1]);
      if (leadData.phone) {
        session.leadCaptured = true;
        await sendLeadEmail(leadData);
        console.log('✅ Lead email sent:', leadData.phone);
      }
    } catch (e) {
      console.error('Lead parse error:', e);
    }
  }
  // Remove the JSON tag from reply before sending to user
  return reply.replace(/\[LEAD_CAPTURED\].*?\[\/LEAD_CAPTURED\]/s, '').trim();
}

// ─── CHAT ENDPOINT ────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !sessionId) return res.status(400).json({ error: 'Missing message or sessionId' });

    const session = getSession(sessionId);
    session.history.push({ role: 'user', content: message });

    let reply = await callGroq(session.history);
    reply = await processLeadFromReply(reply, session);

    session.history.push({ role: 'assistant', content: reply });
    res.json({ reply, sessionId });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ─── IMAGE CHAT ENDPOINT ──────────────────────────────
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
      userContent.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } });
    }
    userContent.push({ type: 'text', text: message || 'Please analyze this property photo' });

    session.history.push({ role: 'user', content: message || '[Property image shared]' });

    let reply = await callGroqVision([
      ...session.history.slice(0, -1),
      { role: 'user', content: userContent }
    ]);
    reply = await processLeadFromReply(reply, session);

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
  if (sessions.has(sessionId)) sessions.get(sessionId).history = [];
  res.json({ cleared: true });
});

async function callGroq(history) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history.slice(-20)],
      temperature: 0.75,
      max_tokens: 600
    })
  });
  if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'Groq API error'); }
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function callGroqVision(messages) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.slice(-10)],
      temperature: 0.75,
      max_tokens: 700
    })
  });
  if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'Groq Vision API error'); }
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

app.listen(PORT, () => {
  console.log(`✅ Markonix Real Estate server running on http://localhost:${PORT}`);
  if (!GROQ_API_KEY) console.warn('⚠️  GROQ_API_KEY not set');
  if (!GMAIL_USER) console.warn('⚠️  GMAIL_USER not set');
  if (!GMAIL_PASS) console.warn('⚠️  GMAIL_PASS not set');
});