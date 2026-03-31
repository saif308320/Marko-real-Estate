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

// ─── AREA → GOOGLE MAPS LINKS ─────────────────────────
const AREA_MAPS = {
  // Karachi
  'dha karachi': 'https://www.google.com/maps/search/DHA+Karachi',
  'dha phase 6': 'https://www.google.com/maps/search/DHA+Phase+6+Karachi',
  'dha phase 8': 'https://www.google.com/maps/search/DHA+Phase+8+Karachi',
  'bahria town karachi': 'https://www.google.com/maps/search/Bahria+Town+Karachi',
  'clifton': 'https://www.google.com/maps/search/Clifton+Karachi',
  'gulshan': 'https://www.google.com/maps/search/Gulshan-e-Iqbal+Karachi',
  'gulshan e iqbal': 'https://www.google.com/maps/search/Gulshan-e-Iqbal+Karachi',
  'nazimabad': 'https://www.google.com/maps/search/Nazimabad+Karachi',
  'north nazimabad': 'https://www.google.com/maps/search/North+Nazimabad+Karachi',
  'pechs': 'https://www.google.com/maps/search/PECHS+Karachi',
  'defence': 'https://www.google.com/maps/search/DHA+Karachi',
  'defense': 'https://www.google.com/maps/search/DHA+Karachi',
  'malir': 'https://www.google.com/maps/search/Malir+Karachi',
  'scheme 33': 'https://www.google.com/maps/search/Scheme+33+Karachi',
  'korangi': 'https://www.google.com/maps/search/Korangi+Karachi',
  'fb area': 'https://www.google.com/maps/search/FB+Area+Karachi',
  'federal b area': 'https://www.google.com/maps/search/Federal+B+Area+Karachi',
  'surjani': 'https://www.google.com/maps/search/Surjani+Town+Karachi',
  'model colony': 'https://www.google.com/maps/search/Model+Colony+Karachi',
  'saadi town': 'https://www.google.com/maps/search/Saadi+Town+Karachi',
  'landhi': 'https://www.google.com/maps/search/Landhi+Karachi',
  'orangi': 'https://www.google.com/maps/search/Orangi+Town+Karachi',
  // Lahore
  'dha lahore': 'https://www.google.com/maps/search/DHA+Lahore',
  'bahria town lahore': 'https://www.google.com/maps/search/Bahria+Town+Lahore',
  'gulberg lahore': 'https://www.google.com/maps/search/Gulberg+Lahore',
  'model town lahore': 'https://www.google.com/maps/search/Model+Town+Lahore',
  'johar town': 'https://www.google.com/maps/search/Johar+Town+Lahore',
  'valencia lahore': 'https://www.google.com/maps/search/Valencia+Housing+Lahore',
  // Islamabad
  'f-7': 'https://www.google.com/maps/search/F-7+Islamabad',
  'f-6': 'https://www.google.com/maps/search/F-6+Islamabad',
  'f-10': 'https://www.google.com/maps/search/F-10+Islamabad',
  'g-13': 'https://www.google.com/maps/search/G-13+Islamabad',
  'bahria town islamabad': 'https://www.google.com/maps/search/Bahria+Town+Islamabad',
  'dha islamabad': 'https://www.google.com/maps/search/DHA+Islamabad',
  'e-7': 'https://www.google.com/maps/search/E-7+Islamabad',
  'blue area': 'https://www.google.com/maps/search/Blue+Area+Islamabad',
};

function getMapLink(text) {
  const lower = text.toLowerCase();
  for (const [key, url] of Object.entries(AREA_MAPS)) {
    if (lower.includes(key)) {
      const label = key.replace(/(^\w|\s\w)/g, c => c.toUpperCase());
      return `\n\n📍 **${label} ka location:** [Google Maps par dekho](${url})`;
    }
  }
  return '';
}

// ─── EMAIL TRANSPORTER ────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

// ─── PROFESSIONAL EMAIL TEMPLATE ─────────────────────
async function sendLeadEmail(leadData) {
  const { name, phone, city, propertyType, budget, extra } = leadData;
  const time = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New Lead — Markonix Real Estate</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <tr><td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
        <div style="display:inline-block;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.3);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;margin-bottom:16px;">🏠</div>
        <h1 style="margin:0;color:#c9a84c;font-size:24px;font-weight:700;letter-spacing:1px;">MARKONIX REAL ESTATE</h1>
        <p style="margin:6px 0 0;color:#a0a8b8;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Lead Notification</p>
      </td></tr>

      <tr><td style="background:#c9a84c;padding:14px 40px;text-align:center;">
        <p style="margin:0;color:#1a1a2e;font-size:15px;font-weight:700;">🔥 New Lead Received — Immediate Action Required</p>
      </td></tr>

      <tr><td style="background:#ffffff;padding:40px;">
        <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
          A new lead has been captured via the Markonix AI chatbot. Please follow up promptly for best conversion.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;">
          <tr style="background:#f8f9fa;">
            <td colspan="2" style="padding:14px 20px;border-bottom:1px solid #e8e8e8;">
              <span style="font-size:12px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase;">Lead Information</span>
            </td>
          </tr>
          <tr style="border-bottom:1px solid #f0f0f0;">
            <td style="padding:14px 20px;width:140px;color:#888;font-size:13px;font-weight:600;">👤 Full Name</td>
            <td style="padding:14px 20px;color:#222;font-size:14px;font-weight:600;">${name || '—'}</td>
          </tr>
          <tr style="background:#fffbf0;border-bottom:1px solid #f0f0f0;">
            <td style="padding:14px 20px;color:#888;font-size:13px;font-weight:600;">📞 Phone</td>
            <td style="padding:14px 20px;">
              <span style="color:#1a1a2e;font-size:20px;font-weight:700;letter-spacing:0.5px;">${phone || '—'}</span>
              ${phone ? `<br><a href="tel:${phone}" style="color:#c9a84c;font-size:12px;text-decoration:none;font-weight:600;">📲 Tap to call</a>` : ''}
            </td>
          </tr>
          <tr style="border-bottom:1px solid #f0f0f0;">
            <td style="padding:14px 20px;color:#888;font-size:13px;font-weight:600;">📍 City / Area</td>
            <td style="padding:14px 20px;color:#333;font-size:14px;">${city || '—'}</td>
          </tr>
          <tr style="background:#f8f9fa;border-bottom:1px solid #f0f0f0;">
            <td style="padding:14px 20px;color:#888;font-size:13px;font-weight:600;">🏠 Property Type</td>
            <td style="padding:14px 20px;color:#333;font-size:14px;">${propertyType || '—'}</td>
          </tr>
          <tr style="border-bottom:1px solid #f0f0f0;">
            <td style="padding:14px 20px;color:#888;font-size:13px;font-weight:600;">💰 Budget</td>
            <td style="padding:14px 20px;color:#2e7d32;font-size:15px;font-weight:700;">${budget || '—'}</td>
          </tr>
          <tr>
            <td style="padding:14px 20px;color:#888;font-size:13px;font-weight:600;">📝 Notes</td>
            <td style="padding:14px 20px;color:#555;font-size:13px;line-height:1.5;">${extra || 'None'}</td>
          </tr>
        </table>

        <div style="margin:28px 0;text-align:center;">
          ${phone ? `<a href="tel:${phone}" style="display:inline-block;background:#c9a84c;color:#1a1a2e;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">📞 Call Lead Now</a>` : ''}
        </div>

        <div style="background:#fff8e1;border-left:4px solid #c9a84c;border-radius:0 8px 8px 0;padding:14px 18px;">
          <p style="margin:0;color:#7a5f00;font-size:13px;font-weight:600;">⚡ Pro Tip</p>
          <p style="margin:4px 0 0;color:#7a5f00;font-size:12px;line-height:1.5;">
            Leads contacted within 5 minutes are 9× more likely to convert. Call now while interest is fresh!
          </p>
        </div>
      </td></tr>

      <tr><td style="background:#1a1a2e;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
        <p style="margin:0;color:#c9a84c;font-size:13px;font-weight:600;">MARKONIX REAL ESTATE</p>
        <p style="margin:4px 0 0;color:#666;font-size:11px;">AI Chatbot Lead System &nbsp;·&nbsp; ${time}</p>
        <p style="margin:8px 0 0;color:#444;font-size:10px;">This email was auto-generated. Do not reply directly.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Markonix Bot 🏠" <${GMAIL_USER}>`,
    to: GMAIL_USER,
    subject: `🔥 Hot Lead: ${name || 'New Client'} | ${phone || 'No phone'} | ${city || '?'} | ${propertyType || '?'}`,
    html
  });
}

// ─── SYSTEM PROMPT ────────────────────────────────────
const SYSTEM_PROMPT = `You are Alex — a senior property consultant at Markonix Real Estate, Pakistan's premium real estate agency. You are not a bot. You are a real person who happens to be brilliant at property.

═══ LANGUAGE — NON-NEGOTIABLE ═══
Detect from the user's VERY FIRST message:
- English message → pure English only, zero Urdu
- Roman Urdu → Roman Urdu only. Use Pakistani words: "ha", "tha", "me", "karo", "lo", "yaar", "bhai". NEVER use Hindi: "hai", "hain", "mein", "kijiye"
- Urdu script → Urdu script only
Switch immediately if user switches. No mixing unless user mixes first.

═══ WHO YOU ARE ═══
You've been in this industry 10+ years. You know Karachi, Lahore, Islamabad like the back of your hand. You speak plainly, never like a brochure. You genuinely care about getting people the right deal — not just closing fast. You remember what people told you and use it. You never repeat the same thing twice in a conversation.

═══ HOW YOU TALK ═══
- Like a trusted friend who happens to be an expert. Warm, direct, sometimes funny.
- React to what they say, not to a script: if they say budget is tight, feel their pain first then offer a solution.
- Use short sentences. No walls of text. Break it up.
- You notice things: "aapne DHA mention kia — koi specific phase mein interest ha?"
- If they send a property photo, actually REACT to it: comment on location, layout, sunlight, potential issues.
- Never start your reply the same way twice in a row.
- End with ONE clear next step — never two questions at once.
- Max 4-5 lines unless they asked for detail.

═══ MAP TRIGGER ═══
When user mentions a specific area or locality → add at end of your reply:
[MAP_AREA]area name as mentioned[/MAP_AREA]
Example: user says "Defence mein ghar chahiye" → add [MAP_AREA]Defence Karachi[/MAP_AREA]
The system auto-attaches the Google Maps link. Do NOT write the URL yourself.

═══ OBJECTION HANDLING ═══
- "Expensive" → "Exact budget batao bhai, market mein options hote hain — aapko surprise karunga"
- "Just looking" → "Bilkul, koi pressure nai. Kaunsa area interest kar raha ha?"
- "Will think" → "Zaroor sochein. Yeh area demand mein ha — bas ek message karo jab ready ho"
- "Bad time" → "No worries — naam aur number chor do, main appropriate time par call karunga"

═══ LEAD CAPTURE — NATURAL ORDER ═══
Collect naturally through conversation. NEVER ask for phone until you have ALL 3:
1. Property type (residential/commercial/plot)
2. City + area
3. Budget range
Then: name → phone → book callback

When asking for phone: "Ek kaam karo — apna number dena, main khud call kar ke best options share karta hoon."

═══ PHONE DETECTION ═══
User shares any number (03XX, +92, etc.) → add EXACTLY at END of reply:
[LEAD_CAPTURED]{"name":"if known","phone":"number","city":"if known","propertyType":"if known","budget":"if known","extra":"anything else"}[/LEAD_CAPTURED]

═══ PRICING (say "roughly" or "market mein aajkal") ═══
- DHA Karachi Phase 6, 500 gaz plot: 3-4 crore
- DHA Karachi Phase 8, 500 gaz: 4.5-6 crore
- Bahria Town Karachi 125 gaz: 80-90 lakh | 250 gaz: 1.5-2 crore
- Clifton apartment 2bed: 1.5-2.5 crore
- Gulshan/Nazimabad apartment 2bed: 80L-1.5 crore
- DHA Lahore 1 kanal plot: 4-6 crore
- Bahria Lahore 10 marla: 1.5-2 crore
- Islamabad F-sector 1 kanal: 8-12 crore

═══ HARD RULES ═══
- Never mention competitor agencies
- You ARE Alex from Markonix — stay in character
- Never sound like a FAQ or chatbot
- One question per message max
- If conversation getting repetitive, change approach`;

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

async function processLeadFromReply(reply, session) {
  const leadMatch = reply.match(/\[LEAD_CAPTURED\](.*?)\[\/LEAD_CAPTURED\]/s);
  if (leadMatch && !session.leadCaptured) {
    try {
      const leadData = JSON.parse(leadMatch[1]);
      if (leadData.phone) {
        session.leadCaptured = true;
        await sendLeadEmail(leadData);
        console.log('✅ Lead captured:', leadData.phone);
      }
    } catch (e) {
      console.error('Lead parse error:', e);
    }
  }

  let mapLink = '';
  const mapMatch = reply.match(/\[MAP_AREA\](.*?)\[\/MAP_AREA\]/s);
  if (mapMatch) {
    mapLink = getMapLink(mapMatch[1].trim());
  }

  let clean = reply
    .replace(/\[LEAD_CAPTURED\].*?\[\/LEAD_CAPTURED\]/s, '')
    .replace(/\[MAP_AREA\].*?\[\/MAP_AREA\]/s, '')
    .trim();

  return clean + mapLink;
}

// ─── ROUTES ───────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !sessionId) return res.status(400).json({ error: 'Missing fields' });
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
      temperature: 0.8,
      max_tokens: 650
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
      temperature: 0.8,
      max_tokens: 700
    })
  });
  if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'Groq Vision error'); }
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

app.listen(PORT, () => {
  console.log(`✅ Markonix server running → http://localhost:${PORT}`);
  if (!GROQ_API_KEY) console.warn('⚠️  GROQ_API_KEY missing');
  if (!GMAIL_USER) console.warn('⚠️  GMAIL_USER missing');
  if (!GMAIL_PASS) console.warn('⚠️  GMAIL_PASS missing');
});