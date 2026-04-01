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

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

async function sendLeadEmail(leadData) {
  const { name, phone, city, propertyType, budget, extra } = leadData;

  const clean = (v) => (!v || v === 'val' || v.toLowerCase() === 'unknown' || v.toLowerCase() === 'not provided') ? '—' : v;
  const n = clean(name);
  const p = clean(phone);
  const c = clean(city);
  const t = clean(propertyType);
  const b = clean(budget);
  const e = clean(extra);

  const time = new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short'
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&family=Playfair+Display:ital,wght@1,600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:30px 16px;background:#f6f6f6;font-family:'Montserrat',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">

<table cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,0.3);">
<tr>

  <!-- ── LEFT BLACK PANEL ── -->
  <td style="width:52%;background:#000000;padding:40px 30px;vertical-align:top;">

    <!-- Brand -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:30px;"><tr>
      <td style="width:34px;height:34px;border:2.5px solid #c29d59;text-align:center;vertical-align:middle;">
        <span style="color:#c29d59;font-weight:900;font-size:14px;display:block;">M</span>
      </td>
      <td style="padding-left:10px;vertical-align:middle;">
        <div style="color:#fff;font-weight:800;font-size:13px;letter-spacing:1.5px;">MARKONIX</div>
        <div style="color:#888;font-size:9px;letter-spacing:3px;">AI LEAD INTELLIGENCE</div>
      </td>
    </tr></table>

    <!-- Headline -->
    <div style="font-size:52px;font-weight:900;color:#fff;line-height:0.85;letter-spacing:-2px;text-transform:uppercase;">LEAD<br>INFO</div>
    <div style="font-family:'Playfair Display',Georgia,serif;font-style:italic;color:#c29d59;font-size:30px;margin:10px 0 24px 0;">Premium Capture</div>

    <!-- Pill -->
    <div style="border:2px solid #c29d59;color:#c29d59;padding:5px 18px;border-radius:50px;font-size:10px;font-weight:800;letter-spacing:3px;display:inline-block;margin-bottom:20px;text-transform:uppercase;">DETAILS:</div>

    <!-- Rows -->
    <table cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:5px 0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:10px;height:10px;border:2px solid #c29d59;border-radius:50%;"></td>
          <td style="padding-left:10px;color:#888;font-size:11px;white-space:nowrap;">👤 Name:</td>
          <td style="padding-left:6px;color:#fff;font-size:13px;font-weight:600;">${n}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:5px 0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:10px;height:10px;border:2px solid #c29d59;border-radius:50%;"></td>
          <td style="padding-left:10px;color:#888;font-size:11px;white-space:nowrap;">📞 Phone:</td>
          <td style="padding-left:6px;color:#c29d59;font-size:14px;font-weight:800;">${p}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:5px 0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:10px;height:10px;border:2px solid #c29d59;border-radius:50%;"></td>
          <td style="padding-left:10px;color:#888;font-size:11px;white-space:nowrap;">📍 City:</td>
          <td style="padding-left:6px;color:#fff;font-size:13px;font-weight:600;">${c}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:5px 0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:10px;height:10px;border:2px solid #c29d59;border-radius:50%;"></td>
          <td style="padding-left:10px;color:#888;font-size:11px;white-space:nowrap;">🏠 Type:</td>
          <td style="padding-left:6px;color:#fff;font-size:13px;font-weight:600;">${t}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:5px 0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:10px;height:10px;border:2px solid #c29d59;border-radius:50%;"></td>
          <td style="padding-left:10px;color:#888;font-size:11px;white-space:nowrap;">💰 Budget:</td>
          <td style="padding-left:6px;color:#00ff88;font-size:14px;font-weight:800;">${b}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:5px 0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:10px;height:10px;border:2px solid #c29d59;border-radius:50%;vertical-align:top;padding-top:3px;"></td>
          <td style="padding-left:10px;color:#888;font-size:11px;white-space:nowrap;vertical-align:top;">📝 Notes:</td>
          <td style="padding-left:6px;color:#aaa;font-size:12px;line-height:1.5;vertical-align:top;">${e}</td>
        </tr></table>
      </td></tr>
    </table>

    <!-- CTA -->
    ${p !== '—' ? `<div style="margin-top:22px;"><a href="tel:${p}" style="background:#c29d59;color:#000;padding:13px 28px;border-radius:50px;font-size:11px;font-weight:800;text-transform:uppercase;text-decoration:none;letter-spacing:1px;display:inline-block;">Connect With ${n !== '—' ? n : 'Client'}</a></div>` : ''}

    <!-- Footer -->
    <div style="margin-top:24px;padding-top:14px;border-top:1px solid #222;">
      <div style="color:#fff;font-size:12px;font-weight:700;">📞 Markonix Real Estate</div>
      <div style="color:#555;font-size:9px;letter-spacing:1.5px;margin-top:2px;">WWW.MARKONIX.AI</div>
      <div style="color:#333;font-size:9px;margin-top:3px;">${time}</div>
    </div>

  </td>

  <!-- ── RIGHT IMAGE ── -->
  <td style="width:48%;padding:0;vertical-align:top;">
    <img src="https://marko-real-estate.vercel.app/email-template.jpg"
         alt="Markonix Property"
         style="width:100%;height:100%;min-height:560px;object-fit:cover;display:block;">
  </td>

</tr>
</table>

</td></tr></table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Markonix Bot 🏠" <${GMAIL_USER}>`,
    to: GMAIL_USER,
    subject: `🔥 New Lead: ${n} | ${p} | ${c} | ${t}`,
    html
  });
}

// ─── SYSTEM PROMPT ────────────────────────────────────
const SYSTEM_PROMPT = `You are a friendly, smart property consultant at Markonix Real Estate, Pakistan's premium agency.

LANGUAGE — FOLLOW STRICTLY:
- User writes English → reply in English ONLY. Zero Urdu/Hindi words.
- User writes Roman Urdu → reply in Roman Urdu ONLY. Use: "ha", "tha", "me", "karo", "bhai". NEVER: "hai", "hain", "mein", "kijiye".
- User writes Urdu script → reply in Urdu script ONLY.
- Switch immediately when user switches.

PERSONALITY:
- Warm, friendly — like a trusted friend who knows real estate.
- Hello/hi/salam → greet back very short + ask what they need.
- Never robotic. Never FAQ style. Never repeat yourself.
- Max 3-4 sentences. ONE question per message only.

STRICT LEAD QUALIFICATION — FOLLOW THIS ORDER ALWAYS:
Step 1: Ask property type (residential/commercial/plot) — if not already given
Step 2: Ask city and area — if not already given  
Step 3: Ask budget — if not already given
Step 4: Ask their name — if not already given
Step 5: ONLY NOW ask for phone number

GOLDEN RULE: NEVER ask for phone number before completing Steps 1-4.
GOLDEN RULE: NEVER skip steps. Even if client seems ready, collect info first.
GOLDEN RULE: Ask ONE thing at a time — never multiple questions together.

When client gives phone number → thank them warmly, confirm all their details back, say you will call soon.

OBJECTION HANDLING:
- "Too expensive" → empathize, ask exact budget, say good options exist
- "Just looking" → no pressure, ask which area interests them
- "Will think" → respect it, say area is in demand, offer callback
- "Bad time" → ask for name and number for later callback

IMAGE REQUESTS:
- Client asks for property photos → "Main aapko actual property ki photos WhatsApp pe bhejta hoon — real aur latest. Bas apna number share karein"
- Use as lead capture opportunity

PRICING:
- DHA Karachi Phase 6, 500 gaz plot: 3-4 crore
- Bahria Town Karachi 125 gaz: 80-90 lakh
- Gulshan/Nazimabad 2 bed apartment: 80 lakh - 1.5 crore
- DHA Lahore 1 kanal: 4-6 crore
- Islamabad F-sector 1 kanal: 8-12 crore
- Always say "roughly" or "current market mein"

LEAD TAG — ADD AT THE VERY END WHEN USER GIVES PHONE:
[LEAD_CAPTURED]{"name":"REAL NAME OR Not provided","phone":"REAL NUMBER","city":"REAL CITY OR Not provided","propertyType":"REAL TYPE OR Not provided","budget":"REAL BUDGET OR Not provided","extra":"other info or none"}[/LEAD_CAPTURED]

TAG RULES:
- Only real values — NEVER "val", "unknown", placeholder text
- Tag at VERY END only — never in middle of message
- User will NOT see this tag

HARD RULES:
- NEVER write "LEAD:", "SHOW_IMAGE", "MAP_AREA" in visible reply
- NEVER mention competitor agencies
- NEVER ask phone before getting property type + city + budget + name`;

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

async function processReply(reply, session) {
  let clean = reply;

  const leadMatch = clean.match(/\[LEAD_CAPTURED\]([\s\S]*?)\[\/LEAD_CAPTURED\]/);
  if (leadMatch && !session.leadCaptured) {
    try {
      const leadData = JSON.parse(leadMatch[1].trim());
      if (leadData.phone && leadData.phone !== 'val' && leadData.phone.toLowerCase() !== 'unknown') {
        session.leadCaptured = true;
        await sendLeadEmail(leadData);
        console.log('✅ Lead:', leadData.phone);
      }
    } catch (e) { console.error('Lead parse error:', e); }
  }

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
      temperature: 0.7,
      max_tokens: 450
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
      temperature: 0.7,
      max_tokens: 550
    })
  });
  if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'Groq Vision error'); }
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

app.listen(PORT, () => {
  console.log(`✅ Markonix → http://localhost:${PORT}`);
  if (!GROQ_API_KEY) console.warn('⚠️  GROQ_API_KEY missing');
  if (!GMAIL_USER) console.warn('⚠️  GMAIL_USER missing');
  if (!GMAIL_PASS) console.warn('⚠️  GMAIL_PASS missing');
});