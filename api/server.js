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

const sessions = new Map();

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

// ─── EMAIL ────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

async function sendLeadEmail(leadData) {
  const { name, phone, city, propertyType, budget, extra } = leadData;
  const time = new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short'
  });

  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 0 60px rgba(201,168,76,0.15);">
  <tr><td style="background:#c9a84c;padding:12px 28px;text-align:center;">
    <p style="margin:0;color:#0d0d0d;font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">🔥 New Lead — Markonix Real Estate</p>
  </td></tr>
  <tr><td style="background:#111111;padding:32px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:11px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:12px;">👤 Name</td><td style="padding:11px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:14px;font-weight:700;text-align:right;">${name || '—'}</td></tr>
      <tr><td style="padding:11px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:12px;">📞 Phone</td><td style="padding:11px 0;border-bottom:1px solid #1e1e1e;color:#c9a84c;font-size:17px;font-weight:800;text-align:right;">${phone || '—'}</td></tr>
      <tr><td style="padding:11px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:12px;">📍 City</td><td style="padding:11px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:14px;font-weight:600;text-align:right;">${city || '—'}</td></tr>
      <tr><td style="padding:11px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:12px;">🏠 Property</td><td style="padding:11px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:14px;font-weight:600;text-align:right;">${propertyType || '—'}</td></tr>
      <tr><td style="padding:11px 0;border-bottom:1px solid #1e1e1e;color:#666;font-size:12px;">💰 Budget</td><td style="padding:11px 0;border-bottom:1px solid #1e1e1e;color:#4ade80;font-size:15px;font-weight:800;text-align:right;">${budget || '—'}</td></tr>
      <tr><td style="padding:11px 0;color:#666;font-size:12px;">📝 Notes</td><td style="padding:11px 0;color:#aaa;font-size:13px;text-align:right;">${extra || 'None'}</td></tr>
    </table>
    ${phone ? `<div style="margin-top:24px;text-align:center;"><a href="tel:${phone}" style="display:inline-block;background:#c9a84c;color:#0d0d0d;padding:14px 36px;border-radius:6px;font-size:12px;font-weight:800;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">📞 CALL NOW — ${phone}</a></div>` : ''}
  </td></tr>
  <tr><td style="background:#0a0a0a;padding:16px 28px;text-align:center;border-top:1px solid #1a1a1a;">
    <p style="margin:0;color:#333;font-size:10px;">${time} · Markonix AI Lead System</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  await transporter.sendMail({
    from: `"Markonix Bot 🏠" <${GMAIL_USER}>`,
    to: GMAIL_USER,
    subject: `🔥 New Lead: ${name || 'Unknown'} | ${phone || 'No phone'} | ${city || '?'}`,
    html
  });
}

// ─── SYSTEM PROMPT ────────────────────────────────────
const SYSTEM_PROMPT = `You are a friendly, smart property consultant at Markonix Real Estate, Pakistan's premium agency.

LANGUAGE — FOLLOW STRICTLY:
- User writes English → reply in English ONLY. No Urdu words at all.
- User writes Roman Urdu → reply in Roman Urdu ONLY. Pakistani words: "ha", "tha", "me", "karo", "bhai". NEVER Hindi: "hai", "hain", "mein", "kijiye".
- User writes Urdu script → reply in Urdu script ONLY.
- If user switches language → you switch too immediately.

PERSONALITY:
- Warm, friendly, helpful — like a trusted friend who knows real estate well.
- When user says "hello" or greets → just greet back warmly and ask how you can help. Keep it short and simple.
- Never sound robotic or like a FAQ page.
- Never repeat yourself.
- Max 3-4 sentences per reply unless user asks for details.
- ONE question per message only.

CONVERSATION FLOW:
- If user greets (hello, hi, salam, assalam) → greet back + ask what they're looking for
- If user asks general question → answer briefly + ask one follow-up
- Naturally collect: property type → city/area → budget → name → phone
- NEVER ask for phone until you have property type + city + budget
- When user gives phone number → thank them, say you'll call soon

OBJECTION HANDLING:
- "Too expensive" → empathize, ask exact budget, say there are options
- "Just looking" → no pressure, ask which area interests them
- "Will think" → respect it, mention area is in demand
- "Bad time" → ask for name and number for callback

PRICING KNOWLEDGE:
- DHA Karachi Phase 6, 500 gaz plot: 3-4 crore
- Bahria Town Karachi 125 gaz: 80-90 lakh
- Gulshan/Nazimabad 2bed apartment: 80 lakh - 1.5 crore
- DHA Lahore 1 kanal: 4-6 crore
- Islamabad F-sector 1 kanal: 8-12 crore
- Always say "roughly" or "current market mein"

LEAD CAPTURE TAG — CRITICAL RULES:
- When user shares phone number, add this at the VERY END of your reply:
[LEAD_CAPTURED]{"name":"name if known or unknown","phone":"number","city":"city if known","propertyType":"type if known","budget":"budget if known","extra":"any other info"}[/LEAD_CAPTURED]
- This tag must be at the END only, never in the middle of text
- User will NOT see this tag

HARD RULES:
- NEVER write "LEAD:", "SHOW_IMAGE", "MAP_AREA" in your visible reply text
- NEVER put tags in the middle of your message
- NEVER mention competitor agencies
- NEVER sound like a chatbot`;

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
    if (now - session.lastActive > 2 * 60 * 60 * 1000) sessions.delete(id);
  }
}, 30 * 60 * 1000);

// ─── CLEAN REPLY — strip ALL tags ─────────────────────
async function processReply(reply, session) {
  let clean = reply;

  // 1. Extract and process LEAD_CAPTURED
  const leadMatch = clean.match(/\[LEAD_CAPTURED\]([\s\S]*?)\[\/LEAD_CAPTURED\]/);
  if (leadMatch && !session.leadCaptured) {
    try {
      const leadData = JSON.parse(leadMatch[1].trim());
      if (leadData.phone) {
        session.leadCaptured = true;
        await sendLeadEmail(leadData);
        console.log('✅ Lead captured:', leadData.phone);
      }
    } catch (e) { console.error('Lead parse error:', e); }
  }

  // 2. Strip ALL known tags and any leftover fragments
  clean = clean
    .replace(/\[LEAD_CAPTURED\][\s\S]*?\[\/LEAD_CAPTURED\]/g, '')
    .replace(/\[\/LEAD_CAPTURED\]/g, '')
    .replace(/\[LEAD_CAPTURED\][\s\S]*/g, '')
    .replace(/\[MAP_AREA\][\s\S]*?\[\/MAP_AREA\]/g, '')
    .replace(/\[\/MAP_AREA\]/g, '')
    .replace(/\[MAP_AREA\][\s\S]*/g, '')
    .replace(/\[SHOW_IMAGE\]/g, '')
    .replace(/SHOW_IMAGE/g, '')
    .replace(/LEAD:/g, '')
    .replace(/MAP:/g, '')
    .trim();

  return clean;
}

// ─── ROUTES ───────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !sessionId) return res.status(400).json({ error: 'Missing fields' });
    const session = getSession(sessionId);
    session.history.push({ role: 'user', content: message });
    let reply = await callGroq(session.history);
    reply = await processReply(reply, session);
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
    if (base64Image) userContent.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } });
    userContent.push({ type: 'text', text: message || 'Please analyze this property photo' });
    session.history.push({ role: 'user', content: message || '[Property image shared]' });
    let reply = await callGroqVision([...session.history.slice(0, -1), { role: 'user', content: userContent }]);
    reply = await processReply(reply, session);
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
      max_tokens: 500
    })
  });
  if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'Groq error'); }
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
      max_tokens: 600
    })
  });
  if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'Groq Vision error'); }
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

app.listen(PORT, () => {
  console.log(`✅ Markonix server → http://localhost:${PORT}`);
  if (!GROQ_API_KEY) console.warn('⚠️  GROQ_API_KEY missing');
  if (!GMAIL_USER) console.warn('⚠️  GMAIL_USER missing');
  if (!GMAIL_PASS) console.warn('⚠️  GMAIL_PASS missing');
});