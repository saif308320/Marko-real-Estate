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

  // Clean values — never show "val" or "unknown"
  const cleanName = (!name || name === 'val' || name === 'unknown' || name === 'Unknown') ? 'Not provided' : name;
  const cleanPhone = (!phone || phone === 'val' || phone === 'unknown') ? 'Not provided' : phone;
  const cleanCity = (!city || city === 'val' || city === 'unknown' || city === 'Unknown') ? 'Not provided' : city;
  const cleanType = (!propertyType || propertyType === 'val' || propertyType === 'unknown' || propertyType === 'Unknown') ? 'Not provided' : propertyType;
  const cleanBudget = (!budget || budget === 'val' || budget === 'unknown' || budget === 'Unknown') ? 'Not provided' : budget;
  const cleanExtra = (!extra || extra === 'val' || extra === 'none' || extra === 'None') ? '—' : extra;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:30px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">

  <!-- TOP IMAGE BANNER -->
  <tr>
    <td style="padding:0;position:relative;">
      <img src="https://marko-real-estate.vercel.app/email-template.jpg" alt="Markonix Real Estate" width="580" style="width:100%;max-width:580px;height:200px;object-fit:cover;display:block;">
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%);"></div>
      <div style="position:absolute;bottom:20px;left:24px;">
        <p style="margin:0;color:#c9a84c;font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Markonix Real Estate</p>
        <h1 style="margin:4px 0 0;color:#ffffff;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">New Lead 🔥</h1>
      </div>
    </td>
  </tr>

  <!-- ALERT BAR -->
  <tr>
    <td style="background:#c9a84c;padding:10px 24px;text-align:center;">
      <p style="margin:0;color:#0a0a0a;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">⚡ Immediate Follow-Up Required</p>
    </td>
  </tr>

  <!-- LEAD DETAILS -->
  <tr>
    <td style="background:#111111;padding:28px 24px;">

      <p style="margin:0 0 18px;color:#444;font-size:10px;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid #1e1e1e;padding-bottom:12px;">Lead Information</p>

      <!-- Name -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:1px;">
        <tr style="border-bottom:1px solid #1a1a1a;">
          <td style="padding:12px 0;width:36px;vertical-align:middle;font-size:16px;">👤</td>
          <td style="padding:12px 8px;color:#666;font-size:12px;vertical-align:middle;">Full Name</td>
          <td style="padding:12px 0;text-align:right;vertical-align:middle;">
            <span style="color:#ffffff;font-size:15px;font-weight:700;">${cleanName}</span>
          </td>
        </tr>
      </table>

      <!-- Phone -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:1px;">
        <tr style="border-bottom:1px solid #1a1a1a;">
          <td style="padding:12px 0;width:36px;vertical-align:middle;font-size:16px;">📞</td>
          <td style="padding:12px 8px;color:#666;font-size:12px;vertical-align:middle;">Phone Number</td>
          <td style="padding:12px 0;text-align:right;vertical-align:middle;">
            <span style="color:#c9a84c;font-size:20px;font-weight:900;">${cleanPhone}</span>
          </td>
        </tr>
      </table>

      <!-- City -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:1px;">
        <tr style="border-bottom:1px solid #1a1a1a;">
          <td style="padding:12px 0;width:36px;vertical-align:middle;font-size:16px;">📍</td>
          <td style="padding:12px 8px;color:#666;font-size:12px;vertical-align:middle;">City / Area</td>
          <td style="padding:12px 0;text-align:right;vertical-align:middle;">
            <span style="color:#ffffff;font-size:14px;font-weight:600;">${cleanCity}</span>
          </td>
        </tr>
      </table>

      <!-- Property Type -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:1px;">
        <tr style="border-bottom:1px solid #1a1a1a;">
          <td style="padding:12px 0;width:36px;vertical-align:middle;font-size:16px;">🏠</td>
          <td style="padding:12px 8px;color:#666;font-size:12px;vertical-align:middle;">Property Type</td>
          <td style="padding:12px 0;text-align:right;vertical-align:middle;">
            <span style="color:#ffffff;font-size:14px;font-weight:600;">${cleanType}</span>
          </td>
        </tr>
      </table>

      <!-- Budget -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:1px;">
        <tr style="border-bottom:1px solid #1a1a1a;">
          <td style="padding:12px 0;width:36px;vertical-align:middle;font-size:16px;">💰</td>
          <td style="padding:12px 8px;color:#666;font-size:12px;vertical-align:middle;">Budget</td>
          <td style="padding:12px 0;text-align:right;vertical-align:middle;">
            <span style="color:#4ade80;font-size:17px;font-weight:800;">${cleanBudget}</span>
          </td>
        </tr>
      </table>

      <!-- Notes -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:12px 0;width:36px;vertical-align:top;font-size:16px;">📝</td>
          <td style="padding:12px 8px;color:#666;font-size:12px;vertical-align:top;">Notes</td>
          <td style="padding:12px 0;text-align:right;vertical-align:top;">
            <span style="color:#888;font-size:13px;line-height:1.5;">${cleanExtra}</span>
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      ${cleanPhone !== 'Not provided' ? `
      <div style="margin-top:24px;text-align:center;">
        <a href="tel:${cleanPhone}" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c96a);color:#0a0a0a;padding:14px 40px;border-radius:8px;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:1px;text-transform:uppercase;">📞 Call Now — ${cleanPhone}</a>
      </div>` : ''}

      <!-- Pro Tip -->
      <div style="margin-top:20px;padding:14px 16px;background:#0d0d0d;border-left:3px solid #c9a84c;border-radius:0 6px 6px 0;">
        <p style="margin:0 0 4px;color:#c9a84c;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">⚡ Pro Tip</p>
        <p style="margin:0;color:#555;font-size:12px;line-height:1.6;">Leads contacted within 5 minutes convert 9× more. Call now!</p>
      </div>

    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#0a0a0a;padding:16px 24px;text-align:center;border-top:1px solid #1a1a1a;">
      <p style="margin:0;color:#c9a84c;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">MARKONIX REAL ESTATE</p>
      <p style="margin:5px 0 0;color:#333;font-size:10px;">${time} &nbsp;·&nbsp; AI Lead System</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Markonix Bot 🏠" <${GMAIL_USER}>`,
    to: GMAIL_USER,
    subject: `🔥 New Lead: ${cleanName} | ${cleanPhone} | ${cleanCity} | ${cleanType}`,
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
- Use image request as lead capture opportunity

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
- When user shares a real phone number, add this EXACTLY at the very END of your reply (after all your text):
[LEAD_CAPTURED]{"name":"ACTUAL_NAME_OR_NOT_PROVIDED","phone":"ACTUAL_NUMBER","city":"ACTUAL_CITY_OR_NOT_PROVIDED","propertyType":"ACTUAL_TYPE_OR_Not_provided","budget":"ACTUAL_BUDGET_OR_Not_provided","extra":"any other details"}[/LEAD_CAPTURED]

RULES FOR TAG:
- Replace ACTUAL_NAME with the real name user told you. If unknown write "Not provided"
- Replace ACTUAL_NUMBER with the real phone number
- Replace ACTUAL_CITY with real city. If unknown write "Not provided"  
- NEVER write "val", "unknown", or placeholder text in the JSON
- Tag must be at the VERY END only, never in the middle
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

  // Extract LEAD_CAPTURED
  const leadMatch = clean.match(/\[LEAD_CAPTURED\]([\s\S]*?)\[\/LEAD_CAPTURED\]/);
  if (leadMatch && !session.leadCaptured) {
    try {
      const leadData = JSON.parse(leadMatch[1].trim());
      if (leadData.phone && leadData.phone !== 'val' && leadData.phone !== 'unknown') {
        session.leadCaptured = true;
        await sendLeadEmail(leadData);
        console.log('✅ Lead captured:', leadData.phone);
      }
    } catch (e) { console.error('Lead parse error:', e); }
  }

  // Strip ALL tags
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