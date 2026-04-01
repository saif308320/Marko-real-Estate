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

  const clean = (v) => (!v || v === 'val' || v.toLowerCase() === 'unknown' || v.toLowerCase() === 'not provided' || v === '—') ? '—' : v;
  const n = clean(name);
  const p = clean(phone);
  const c = clean(city);
  const t = clean(propertyType);
  const b = clean(budget);
  const e = clean(extra);

  const time = new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short'
  });

  // Exact flyer design from your HTML — converted to email-safe inline styles
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&family=Playfair+Display:ital,wght@1,600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:30px 16px;background:#f6f6f6;font-family:'Montserrat',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">

<!-- MAIN CANVAS — 600px wide flyer -->
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,0.3);background:#ffffff;">
<tr valign="top">

  <!-- LEFT BLACK PANEL -->
  <td width="290" valign="top" style="background:#000000;padding:40px 30px;width:290px;">

    <!-- Brand Header -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr valign="middle">
        <td style="width:32px;height:32px;border:2.5px solid #c29d59;text-align:center;vertical-align:middle;transform:rotate(45deg);">
          <span style="display:block;color:#c29d59;font-weight:900;font-size:13px;transform:rotate(-45deg);">M</span>
        </td>
        <td style="padding-left:10px;">
          <div style="color:#ffffff;font-weight:800;font-size:13px;letter-spacing:1.5px;line-height:1.2;">MARKONIX</div>
          <div style="color:#888888;font-weight:400;font-size:9px;letter-spacing:3px;">AI LEAD INTELLIGENCE</div>
        </td>
      </tr>
    </table>

    <!-- Big Headline -->
    <div style="font-size:54px;font-weight:900;color:#ffffff;line-height:0.85;letter-spacing:-2px;text-transform:uppercase;margin-bottom:8px;">LEAD<br>INFO</div>

    <!-- Italic Subheading -->
    <div style="font-family:'Playfair Display',Georgia,serif;font-style:italic;color:#c29d59;font-size:34px;margin-bottom:26px;">Premium Capture</div>

    <!-- Gold pill label -->
    <div style="display:inline-block;border:2px solid #c29d59;color:#c29d59;padding:5px 20px;border-radius:50px;font-size:10px;font-weight:800;letter-spacing:3px;text-transform:uppercase;margin-bottom:22px;">DETAILS:</div>

    <!-- Lead Info Rows -->
    <table cellpadding="0" cellspacing="4" style="width:100%;">
      <tr>
        <td style="padding:5px 0;vertical-align:middle;">
          <span style="display:inline-block;width:8px;height:8px;border:2px solid #c29d59;border-radius:50%;margin-right:10px;vertical-align:middle;"></span>
          <span style="color:#888;font-size:11px;vertical-align:middle;">👤 Name:</span>
          <span style="color:#ffffff;font-size:13px;font-weight:600;margin-left:6px;vertical-align:middle;">${n}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:5px 0;vertical-align:middle;">
          <span style="display:inline-block;width:8px;height:8px;border:2px solid #c29d59;border-radius:50%;margin-right:10px;vertical-align:middle;"></span>
          <span style="color:#888;font-size:11px;vertical-align:middle;">📞 Phone:</span>
          <span style="color:#c29d59;font-size:14px;font-weight:800;margin-left:6px;vertical-align:middle;">${p}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:5px 0;vertical-align:middle;">
          <span style="display:inline-block;width:8px;height:8px;border:2px solid #c29d59;border-radius:50%;margin-right:10px;vertical-align:middle;"></span>
          <span style="color:#888;font-size:11px;vertical-align:middle;">📍 City:</span>
          <span style="color:#ffffff;font-size:13px;font-weight:600;margin-left:6px;vertical-align:middle;">${c}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:5px 0;vertical-align:middle;">
          <span style="display:inline-block;width:8px;height:8px;border:2px solid #c29d59;border-radius:50%;margin-right:10px;vertical-align:middle;"></span>
          <span style="color:#888;font-size:11px;vertical-align:middle;">🏠 Type:</span>
          <span style="color:#ffffff;font-size:13px;font-weight:600;margin-left:6px;vertical-align:middle;">${t}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:5px 0;vertical-align:middle;">
          <span style="display:inline-block;width:8px;height:8px;border:2px solid #c29d59;border-radius:50%;margin-right:10px;vertical-align:middle;"></span>
          <span style="color:#888;font-size:11px;vertical-align:middle;">💰 Budget:</span>
          <span style="color:#00ff88;font-size:14px;font-weight:800;margin-left:6px;vertical-align:middle;">${b}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:5px 0;vertical-align:top;">
          <span style="display:inline-block;width:8px;height:8px;border:2px solid #c29d59;border-radius:50%;margin-right:10px;vertical-align:top;margin-top:4px;"></span>
          <span style="color:#888;font-size:11px;vertical-align:top;">📝 Notes:</span>
          <span style="color:#aaaaaa;font-size:12px;font-weight:400;margin-left:6px;vertical-align:top;line-height:1.5;">${e}</span>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    ${p !== '—' ? `<div style="margin-top:22px;"><a href="tel:${p}" style="display:inline-block;background:#c29d59;color:#000000;padding:14px 30px;border-radius:50px;font-size:11px;font-weight:800;text-transform:uppercase;text-decoration:none;letter-spacing:1px;">Connect With ${n !== '—' ? n : 'Client'}</a></div>` : ''}

    <!-- Footer -->
    <div style="margin-top:26px;padding-top:14px;border-top:1px solid #222222;">
      <div style="color:#ffffff;font-weight:700;font-size:12px;">📞 +92 316 353 3206</div>
      <div style="color:#555555;font-size:9px;letter-spacing:1.5px;margin-top:3px;">WWW.MARKONIX.AI</div>
      <div style="color:#333333;font-size:9px;margin-top:4px;">${time}</div>
    </div>

  </td>

  <!-- RIGHT IMAGE PANEL -->
  <td width="310" valign="top" style="padding:0;width:310px;overflow:hidden;">
    <img src="https://marko-real-estate.vercel.app/email-template.jpg"
         alt="Markonix Property"
         width="310"
         style="width:310px;height:100%;min-height:520px;object-fit:cover;display:block;vertical-align:top;">
  </td>

</tr>
</table>
<!-- END CANVAS -->

</td></tr>
</table>

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
- User writes English → reply in English ONLY. No Urdu words at all.
- User writes Roman Urdu → reply in Roman Urdu ONLY. Pakistani words: "ha", "tha", "me", "karo", "bhai". NEVER Hindi: "hai", "hain", "mein", "kijiye".
- User writes Urdu script → reply in Urdu script ONLY.
- If user switches language → you switch too immediately.

PERSONALITY:
- Warm, friendly, helpful — like a trusted friend who knows real estate well.
- When user says hello/hi/salam → greet back warmly + ask what they're looking for. Keep it very short.
- Never sound robotic or like a FAQ page.
- Never repeat yourself.
- Max 3-4 sentences per reply unless user asks for details.
- ONE question per message only.

CONVERSATION FLOW — COLLECT IN THIS ORDER:
1. Property type (residential/commercial/plot)
2. City and area
3. Budget
4. Name
5. Phone number

CRITICAL LEAD RULE:
- NEVER ask for phone number until you have ALL 3: property type + city + budget
- When user gives phone number → thank them warmly, confirm their details, say you will call soon

IMAGE REQUESTS:
- If client asks for property photos → say "Main aapko actual property ki photos WhatsApp pe bhejta hoon — bilkul real aur latest. Bas apna number share karein"

OBJECTION HANDLING:
- "Too expensive" → empathize, ask exact budget, say there are good options
- "Just looking" → no pressure, ask which area interests them
- "Will think" → respect it, mention area is in demand, offer callback
- "Bad time" → ask for name and number for callback

PRICING:
- DHA Karachi Phase 6, 500 gaz plot: 3-4 crore
- Bahria Town Karachi 125 gaz: 80-90 lakh
- Gulshan/Nazimabad 2bed apartment: 80 lakh - 1.5 crore
- DHA Lahore 1 kanal: 4-6 crore
- Islamabad F-sector 1 kanal: 8-12 crore
- Always say "roughly" or "current market mein"

LEAD CAPTURE TAG — VERY IMPORTANT:
- When user shares a real phone number, add this EXACTLY at the very END of your reply:
[LEAD_CAPTURED]{"name":"ACTUAL NAME OR Not provided","phone":"ACTUAL NUMBER","city":"ACTUAL CITY OR Not provided","propertyType":"ACTUAL TYPE OR Not provided","budget":"ACTUAL BUDGET OR Not provided","extra":"any other details or none"}[/LEAD_CAPTURED]

RULES:
- Use real values the user told you. If unknown write "Not provided"
- NEVER write "val", "unknown", or placeholder text
- Tag must be at the VERY END only
- User will NOT see this tag

HARD RULES:
- NEVER write "LEAD:", "SHOW_IMAGE", "MAP_AREA" in your visible reply
- NEVER put tags in the middle of your message
- NEVER mention competitor agencies`;

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
        console.log('✅ Lead captured:', leadData.phone);
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