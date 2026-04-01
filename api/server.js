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
const UNSPLASH_KEY = process.env.UNSPLASH_KEY || 'wucMrztmU7hP41X5C-cxqm66wkgbr55d-EW7RhAfVag';

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
  'dha phase 6': 'https://www.google.com/maps/search/DHA+Phase+6+Karachi',
  'dha phase 8': 'https://www.google.com/maps/search/DHA+Phase+8+Karachi',
  'dha karachi': 'https://www.google.com/maps/search/DHA+Karachi',
  'bahria town karachi': 'https://www.google.com/maps/search/Bahria+Town+Karachi',
  'clifton': 'https://www.google.com/maps/search/Clifton+Karachi',
  'gulshan e iqbal': 'https://www.google.com/maps/search/Gulshan-e-Iqbal+Karachi',
  'gulshan': 'https://www.google.com/maps/search/Gulshan-e-Iqbal+Karachi',
  'nazimabad': 'https://www.google.com/maps/search/Nazimabad+Karachi',
  'north nazimabad': 'https://www.google.com/maps/search/North+Nazimabad+Karachi',
  'pechs': 'https://www.google.com/maps/search/PECHS+Karachi',
  'defence': 'https://www.google.com/maps/search/DHA+Karachi',
  'defense': 'https://www.google.com/maps/search/DHA+Karachi',
  'malir': 'https://www.google.com/maps/search/Malir+Karachi',
  'scheme 33': 'https://www.google.com/maps/search/Scheme+33+Karachi',
  'korangi': 'https://www.google.com/maps/search/Korangi+Karachi',
  'fb area': 'https://www.google.com/maps/search/FB+Area+Karachi',
  'surjani': 'https://www.google.com/maps/search/Surjani+Town+Karachi',
  'landhi': 'https://www.google.com/maps/search/Landhi+Karachi',
  'orangi': 'https://www.google.com/maps/search/Orangi+Town+Karachi',
  'dha lahore': 'https://www.google.com/maps/search/DHA+Lahore',
  'bahria town lahore': 'https://www.google.com/maps/search/Bahria+Town+Lahore',
  'gulberg lahore': 'https://www.google.com/maps/search/Gulberg+Lahore',
  'model town lahore': 'https://www.google.com/maps/search/Model+Town+Lahore',
  'johar town': 'https://www.google.com/maps/search/Johar+Town+Lahore',
  'f-7': 'https://www.google.com/maps/search/F-7+Islamabad',
  'f-6': 'https://www.google.com/maps/search/F-6+Islamabad',
  'f-10': 'https://www.google.com/maps/search/F-10+Islamabad',
  'g-13': 'https://www.google.com/maps/search/G-13+Islamabad',
  'bahria town islamabad': 'https://www.google.com/maps/search/Bahria+Town+Islamabad',
  'dha islamabad': 'https://www.google.com/maps/search/DHA+Islamabad',
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

// ─── UNSPLASH PROPERTY IMAGES ──────────────────────────
const PROPERTY_KEYWORDS = {
  'villa': 'luxury villa exterior',
  'dha': 'luxury house modern exterior',
  'bahria': 'modern house exterior',
  'clifton': 'luxury apartment interior',
  'gulshan': 'house interior modern',
  'defence': 'luxury house modern exterior',
  'defense': 'luxury house modern exterior',
  'apartment': 'modern apartment interior living room',
  'flat': 'modern apartment interior',
  'plot': 'residential land plot',
  'commercial': 'modern commercial building exterior',
  'office': 'modern office interior',
  'shop': 'modern retail shop interior',
  'ghar': 'luxury house interior modern',
  'house': 'luxury house exterior modern',
  'property': 'luxury real estate house',
};

async function getPropertyImage(userMessage) {
  try {
    const lower = userMessage.toLowerCase();
    let keyword = 'luxury house modern exterior';
    for (const [key, val] of Object.entries(PROPERTY_KEYWORDS)) {
      if (lower.includes(key)) { keyword = val; break; }
    }
    const encoded = encodeURIComponent(keyword);
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encoded}&per_page=5&orientation=landscape`,
      { headers: { 'Authorization': `Client-ID ${UNSPLASH_KEY}` } }
    );
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const idx = Math.floor(Math.random() * Math.min(5, data.results.length));
      return data.results[idx].urls.regular;
    }
  } catch (e) {
    console.error('Unsplash error:', e);
  }
  return null;
}

// ─── EMAIL TRANSPORTER ────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

// ─── EMAIL TEMPLATE ───────────────────────────────────
async function sendLeadEmail(leadData) {
  const { name, phone, city, propertyType, budget, extra } = leadData;
  const time = new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short'
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>New Lead — Markonix</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 0 60px rgba(201,168,76,0.15);">

  <tr>
    <td style="background:#0d0d0d;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="45%" style="background:#111111;padding:40px 28px;vertical-align:middle;">
            <div style="width:44px;height:44px;border:2px solid #c9a84c;border-radius:10px;text-align:center;line-height:44px;margin-bottom:16px;font-size:20px;">🏠</div>
            <p style="margin:0 0 4px;color:#c9a84c;font-size:9px;letter-spacing:3px;text-transform:uppercase;">Markonix</p>
            <h1 style="margin:0 0 4px;color:#ffffff;font-size:26px;font-weight:900;line-height:1.1;text-transform:uppercase;">REAL<br>ESTATE</h1>
            <p style="margin:0;color:#c9a84c;font-size:18px;font-style:italic;font-family:Georgia,serif;">New Lead</p>
          </td>
          <td width="55%" style="background:linear-gradient(135deg,#c9a84c 0%,#a07830 100%);padding:40px 20px;vertical-align:middle;text-align:center;">
            <div style="font-size:60px;line-height:1;">🏡</div>
            <p style="margin:12px 0 0;color:#1a1100;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Hot Prospect</p>
            <p style="margin:6px 0 0;color:#3d2800;font-size:10px;">Follow up immediately</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:#c9a84c;padding:12px 28px;text-align:center;">
      <p style="margin:0;color:#0d0d0d;font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">🔥 Immediate Follow-Up Required</p>
    </td>
  </tr>

  <tr>
    <td style="background:#111111;padding:32px 28px;">
      <p style="margin:0 0 20px;color:#555;font-size:11px;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid #222;padding-bottom:12px;">Lead Information</p>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #1e1e1e;width:30px;vertical-align:middle;font-size:14px;">👤</td>
          <td style="padding:11px 10px;border-bottom:1px solid #1e1e1e;color:#666;font-size:12px;vertical-align:middle;">Full Name</td>
          <td style="padding:11px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:14px;font-weight:700;text-align:right;vertical-align:middle;">${name || '—'}</td>
        </tr>
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #1e1e1e;font-size:14px;vertical-align:middle;">📞</td>
          <td style="padding:11px 10px;border-bottom:1px solid #1e1e1e;color:#666;font-size:12px;vertical-align:middle;">Phone</td>
          <td style="padding:11px 0;border-bottom:1px solid #1e1e1e;text-align:right;vertical-align:middle;">
            <span style="color:#c9a84c;font-size:17px;font-weight:800;">${phone || '—'}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #1e1e1e;font-size:14px;vertical-align:middle;">📍</td>
          <td style="padding:11px 10px;border-bottom:1px solid #1e1e1e;color:#666;font-size:12px;vertical-align:middle;">City / Area</td>
          <td style="padding:11px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:14px;font-weight:600;text-align:right;vertical-align:middle;">${city || '—'}</td>
        </tr>
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #1e1e1e;font-size:14px;vertical-align:middle;">🏠</td>
          <td style="padding:11px 10px;border-bottom:1px solid #1e1e1e;color:#666;font-size:12px;vertical-align:middle;">Property Type</td>
          <td style="padding:11px 0;border-bottom:1px solid #1e1e1e;color:#fff;font-size:14px;font-weight:600;text-align:right;vertical-align:middle;">${propertyType || '—'}</td>
        </tr>
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #1e1e1e;font-size:14px;vertical-align:middle;">💰</td>
          <td style="padding:11px 10px;border-bottom:1px solid #1e1e1e;color:#666;font-size:12px;vertical-align:middle;">Budget</td>
          <td style="padding:11px 0;border-bottom:1px solid #1e1e1e;color:#4ade80;font-size:15px;font-weight:800;text-align:right;vertical-align:middle;">${budget || '—'}</td>
        </tr>
        <tr>
          <td style="padding:11px 0;font-size:14px;vertical-align:top;padding-top:14px;">📝</td>
          <td style="padding:11px 10px;color:#666;font-size:12px;vertical-align:top;padding-top:14px;">Notes</td>
          <td style="padding:11px 0;color:#aaa;font-size:13px;text-align:right;vertical-align:top;padding-top:14px;line-height:1.5;">${extra || 'None'}</td>
        </tr>
      </table>

      <div style="margin-top:28px;text-align:center;">
        ${phone ? `<a href="tel:${phone}" style="display:inline-block;background:#c9a84c;color:#0d0d0d;padding:14px 36px;border-radius:6px;font-size:12px;font-weight:800;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">📞 BOOK NOW &nbsp;·&nbsp; ${phone}</a>` : ''}
      </div>

      <div style="margin-top:22px;border:1px solid #222;border-left:3px solid #c9a84c;border-radius:6px;padding:14px 16px;background:#0d0d0d;">
        <p style="margin:0 0 4px;color:#c9a84c;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">⚡ Pro Tip</p>
        <p style="margin:0;color:#555;font-size:12px;line-height:1.6;">Leads contacted within 5 minutes are 9× more likely to convert. Call now!</p>
      </div>
    </td>
  </tr>

  <tr>
    <td style="background:#0a0a0a;padding:18px 28px;text-align:center;border-top:1px solid #1a1a1a;">
      <p style="margin:0;color:#c9a84c;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">MARKONIX REAL ESTATE</p>
      <p style="margin:5px 0 0;color:#333;font-size:10px;">${time} &nbsp;·&nbsp; AI Chatbot Lead System</p>
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
    subject: `🔥 New Lead: ${name || 'Unknown'} | ${phone || 'No phone'} | ${city || '?'} | ${propertyType || '?'}`,
    html
  });
}

// ─── SYSTEM PROMPT ────────────────────────────────────
const SYSTEM_PROMPT = `You are Alex — a senior property consultant at Markonix Real Estate, Pakistan's premium real estate agency. You are not a bot. You are a real person who happens to be brilliant at property.

═══ LANGUAGE — NON-NEGOTIABLE ═══
Detect from the user's VERY FIRST message:
- English only → reply in pure English only. ZERO Urdu or Roman Urdu. Never use "yaar", "bhai", "ha", "tha", "karo", "lo".
- Roman Urdu → Roman Urdu only. Pakistani words: "ha", "tha", "me", "karo", "yaar", "bhai". NEVER Hindi: "hai", "hain", "mein", "kijiye".
- Urdu script → Urdu script only.
Switch immediately if user switches. No mixing unless user mixes first.

═══ WHO YOU ARE ═══
10+ years in Pakistani real estate. Know Karachi, Lahore, Islamabad inside out. Speak plainly — never like a brochure. Genuinely care about the right deal. Never repeat the same thing twice.

═══ HOW YOU TALK ═══
- Trusted friend who is an expert. Warm, direct, sometimes witty.
- React naturally: if budget is tight, empathize first then solve.
- Short sentences. No walls of text.
- Notice details: "aapne DHA mention kia — koi specific phase mein interest ha?"
- If they send a property photo, comment on location, layout, sunlight, issues.
- Never start reply the same way twice in a row.
- End with ONE clear next step — never two questions at once.
- Max 4-5 lines unless detail was asked.

═══ SPECIAL TAGS — ALWAYS AT END ONLY ═══
These tags must ONLY appear at the very END of your reply, never in the middle:

MAP: When user mentions a specific area → [MAP_AREA]area name[/MAP_AREA]
IMAGE: When showing property visuals would help → [SHOW_IMAGE]
LEAD: When user shares phone number → [LEAD_CAPTURED]{"name":"val","phone":"val","city":"val","propertyType":"val","budget":"val","extra":"val"}[/LEAD_CAPTURED]

CRITICAL: Never write these tags in the middle of your text. Always at the END.

═══ OBJECTION HANDLING ═══
- "Expensive" → ask exact budget, say market has options
- "Just looking" → no pressure, ask which area interests them
- "Will think" → respect it, note area is in demand
- "Bad time" → ask for name and number for callback

═══ LEAD CAPTURE — NATURAL ORDER ═══
Collect through conversation. NEVER ask for phone until you have ALL 3:
1. Property type
2. City + area
3. Budget range
Then: name → phone → callback

═══ PRICING ═══
- DHA Karachi Phase 6, 500 gaz plot: 3-4 crore
- DHA Karachi Phase 8, 500 gaz: 4.5-6 crore
- Bahria Town Karachi 125 gaz: 80-90 lakh | 250 gaz: 1.5-2 crore
- Clifton apartment 2bed: 1.5-2.5 crore
- Gulshan/Nazimabad apartment 2bed: 80L-1.5 crore
- DHA Lahore 1 kanal plot: 4-6 crore
- Bahria Lahore 10 marla: 1.5-2 crore
- Islamabad F-sector 1 kanal: 8-12 crore

═══ HARD RULES ═══
- Never mention competitors
- Stay in character as Alex from Markonix
- Never sound like a chatbot or FAQ
- One question per message max`;

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

async function processLeadFromReply(reply, session, userMessage = '') {
  let clean = reply;

  // ── Strip LEAD_CAPTURED (process silently) ──
  const leadMatch = clean.match(/\[LEAD_CAPTURED\]([\s\S]*?)\[\/LEAD_CAPTURED\]/);
  clean = clean.replace(/\[LEAD_CAPTURED\][\s\S]*?\[\/LEAD_CAPTURED\]/g, '').trim();
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

  // ── Strip MAP_AREA, generate link ──
  let mapLink = '';
  const mapMatch = clean.match(/\[MAP_AREA\]([\s\S]*?)\[\/MAP_AREA\]/);
  clean = clean.replace(/\[MAP_AREA\][\s\S]*?\[\/MAP_AREA\]/g, '').trim();
  if (mapMatch) mapLink = getMapLink(mapMatch[1].trim());

  // ── Strip SHOW_IMAGE, fetch from Unsplash ──
  let imageTag = '';
  if (clean.includes('[SHOW_IMAGE]')) {
    clean = clean.replace(/\[SHOW_IMAGE\]/g, '').trim();
    const imgUrl = await getPropertyImage(userMessage || reply);
    if (imgUrl) imageTag = `\n[PROPERTY_IMAGE:${imgUrl}]`;
  }

  // ── Safety net: remove any stray leftover tags ──
  clean = clean
    .replace(/\[LEAD_CAPTURED\][\s\S]*/g, '')
    .replace(/\[\/LEAD_CAPTURED\]/g, '')
    .replace(/\[MAP_AREA\][\s\S]*/g, '')
    .replace(/\[\/MAP_AREA\]/g, '')
    .replace(/\[SHOW_IMAGE\]/g, '')
    .trim();

  return clean + mapLink + imageTag;
}

// ─── ROUTES ───────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !sessionId) return res.status(400).json({ error: 'Missing fields' });
    const session = getSession(sessionId);
    session.history.push({ role: 'user', content: message });
    let reply = await callGroq(session.history);
    reply = await processLeadFromReply(reply, session, message);
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
    reply = await processLeadFromReply(reply, session, message || '');
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