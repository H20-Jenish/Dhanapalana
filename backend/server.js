/**
 * ============================================================================
 * Dhanapālana - Backend Core Server (server.js)
 * ============================================================================
 * OVERALL ROLE:
 * Central Express.js API server for the Dhanapālana financial platform. 
 * Acts as the single source of truth for the database, enforces security protocols 
 * (JWT, MFA, role-based access), manages automated system backups, and orchestrates 
 * a local AI engine via a Telegram webhook interface.
 */

const express = require('express');
const { Pool } = require('pg');
const winston = require('winston');
const cors = require('cors');
const helmet = require('helmet'); // Security Headers
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { exec } = require('child_process');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');
const cron = require('node-cron');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const ngrok = require('@ngrok/ngrok');
const crypto = require('crypto');
const Docker = require('dockerode');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const { generateText } = require('ai');
const { createOllama } = require('ollama-ai-provider-v2');

const ollama = createOllama({
  baseURL: 'http://ollama:11434/api',
});

let JWT_SECRET = process.env.JWT_SECRET || ''; 

// ==========================================
// TELEGRAM CONVERSATION HISTORY
// Per-chatId message store so the AI can
// answer follow-up questions in context.
// ==========================================
const conversationHistories = new Map();
const HISTORY_MAX_EXCHANGES = 10;     // keep last 10 back-and-forth turns
const HISTORY_TIMEOUT_MS = 30 * 60 * 1000; // reset after 30 min of inactivity

const getConversationHistory = (chatId) => {
  const now = Date.now();
  const entry = conversationHistories.get(chatId);
  if (!entry || (now - entry.lastActivity) > HISTORY_TIMEOUT_MS) {
    const fresh = { messages: [], lastActivity: now };
    conversationHistories.set(chatId, fresh);
    return fresh;
  }
  entry.lastActivity = now;
  return entry;
};

const appendToConversation = (chatId, userMsg, assistantMsg) => {
  const entry = getConversationHistory(chatId);
  entry.messages.push({ role: 'user', content: userMsg });
  entry.messages.push({ role: 'assistant', content: assistantMsg });
  // Trim to the most recent HISTORY_MAX_EXCHANGES exchanges
  if (entry.messages.length > HISTORY_MAX_EXCHANGES * 2) {
    entry.messages = entry.messages.slice(-(HISTORY_MAX_EXCHANGES * 2));
  }
};

const app = express();

const parseAllowedOrigins = () => {
  const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaultOrigins = [
    'http://localhost',
    'https://localhost',
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost:5173',
    'https://localhost:5173',
    'http://127.0.0.1',
    'https://127.0.0.1',
    'http://127.0.0.1:3000',
    'https://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://127.0.0.1:5173',
    'https://your-production-domain.com'
  ];

  return [...new Set([...defaultOrigins, ...configuredOrigins])];
};

// ==========================================
// SECURITY MIDDLEWARE (OWASP ZAP FIXES)
// ==========================================

// 1. Helmet: Fixes CSP and Missing Anti-clickjacking Header
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.telegram.org"], 
    },
  },
  crossOriginEmbedderPolicy: false, 
}));

// 2. CORS Tightening: Fixes Cross-Domain Misconfiguration
const allowedOrigins = parseAllowedOrigins();
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (!allowedOrigins.includes(origin)) {
      return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
    }
    return callback(null, true);
  },
  credentials: true 
}));

app.use(express.json());
const upload = multer({ dest: 'uploads/' });

const BACKUP_DIR = '/backups';
if (!fs.existsSync(BACKUP_DIR)) { fs.mkdirSync(BACKUP_DIR); }

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console(), 
    new winston.transports.File({ filename: 'app-activity.log' })
  ]
});

const pool = new Pool({
  user: process.env.DB_USER || 'admin', 
  host: process.env.DB_HOST || 'db', 
  database: process.env.DB_NAME || 'initial_db',
  password: process.env.DB_PASSWORD || 'J#nish2275', 
  port: process.env.DB_PORT || 5432,
});

const initJwtSecret = async () => {
  try {
    const res = await pool.query("SELECT value FROM system_settings WHERE key = 'JWT_SECRET'");
    if (res.rows.length > 0) { 
      JWT_SECRET = res.rows[0].value; 
    } else {
      JWT_SECRET = crypto.randomBytes(64).toString('hex');
      await pool.query("INSERT INTO system_settings (key, value) VALUES ('JWT_SECRET', $1)", [JWT_SECRET]);
    }
  } catch (err) { 
    logger.error("Failed to init JWT Secret:", err.message); 
  }
};

const initializeTunnel = async (ngrokToken, telegramToken) => {
  try {
    logger.info('Starting Ngrok tunnel...');
    const listener = await ngrok.forward({ addr: 5000, authtoken: ngrokToken });
    const publicUrl = listener.url();
    logger.info(`✅ Ngrok tunnel established at: ${publicUrl}`);
    
    if (telegramToken) {
      const tb = await axios.post(`https://api.telegram.org/bot${telegramToken}/setWebhook`, { 
        url: `${publicUrl}/api/telegram/webhook`, 
        drop_pending_updates: true 
      });
      logger.info(`✅ Telegram Webhook linked: ${tb.data.description}`);
    }
    return publicUrl;
  } catch (err) {
    logger.error(`❌ Ngrok Tunnel Error: ${err.message}`);
  }
};

const runMigrations = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, mfa_secret TEXT, mfa_enabled BOOLEAN DEFAULT FALSE, reset_otp TEXT, reset_otp_expires TIMESTAMP);
        CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS banks (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS recipient_banks (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS account_types (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS credit_cards (id SERIAL PRIMARY KEY, name TEXT NOT NULL, limit_amount DECIMAL(15,2) DEFAULT 0, balance DECIMAL(15,2) DEFAULT 0);
        CREATE TABLE IF NOT EXISTS savings_accounts (id SERIAL PRIMARY KEY, bank_id INTEGER REFERENCES banks(id), account_type_id INTEGER REFERENCES account_types(id), currency TEXT, balance DECIMAL(15,2) DEFAULT 0);
        CREATE TABLE IF NOT EXISTS income (id SERIAL PRIMARY KEY, source TEXT, amount DECIMAL(15,2), account_id INTEGER REFERENCES savings_accounts(id), date DATE, status TEXT DEFAULT 'ACTIVE');
        CREATE TABLE IF NOT EXISTS expenses (id SERIAL PRIMARY KEY, amount DECIMAL(15,2), category_id INTEGER REFERENCES categories(id), account_id INTEGER REFERENCES savings_accounts(id), credit_card_id INTEGER REFERENCES credit_cards(id), description TEXT, date DATE, status TEXT DEFAULT 'ACTIVE');
        CREATE TABLE IF NOT EXISTS transfers (id SERIAL PRIMARY KEY, source_account_id INTEGER REFERENCES savings_accounts(id), recipient TEXT, recipient_bank_id INTEGER REFERENCES recipient_banks(id), amount DECIMAL(15,2), exchange_rate DECIMAL(15,2), inr_amount DECIMAL(15,2), method TEXT, date DATE, status TEXT DEFAULT 'ACTIVE');
        CREATE TABLE IF NOT EXISTS lending (id SERIAL PRIMARY KEY, source_account_id INTEGER REFERENCES savings_accounts(id), recipient TEXT, recipient_bank_id INTEGER REFERENCES recipient_banks(id), amount DECIMAL(15,2), repaid DECIMAL(15,2) DEFAULT 0, method TEXT, date DATE, status TEXT DEFAULT 'ACTIVE');
        CREATE TABLE IF NOT EXISTS investments (id SERIAL PRIMARY KEY, name TEXT NOT NULL, bank_id INTEGER REFERENCES banks(id), type TEXT NOT NULL, status TEXT DEFAULT 'ACTIVE');
        CREATE TABLE IF NOT EXISTS investment_logs (id SERIAL PRIMARY KEY, investment_id INTEGER REFERENCES investments(id), date DATE NOT NULL, balance DECIMAL(15,2) NOT NULL, net_contribution DECIMAL(15,2) DEFAULT 0.00, status TEXT DEFAULT 'ACTIVE');
        CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, message TEXT NOT NULL, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, action_details TEXT NOT NULL, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE IF NOT EXISTS password_history (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, password_hash TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS ai_monthly_insights (month TEXT PRIMARY KEY, insights TEXT, generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS system_backups (id SERIAL PRIMARY KEY, version TEXT UNIQUE NOT NULL, filename TEXT NOT NULL, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      `);
      
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp TEXT;`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expires TIMESTAMP;`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
      await pool.query(`ALTER TABLE investments ADD COLUMN IF NOT EXISTS account_type_id INTEGER REFERENCES account_types(id);`);
      await pool.query(`CREATE TABLE IF NOT EXISTS ai_query_examples (id SERIAL PRIMARY KEY, question TEXT NOT NULL, sql_query TEXT NOT NULL, description TEXT DEFAULT '', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
      
      await pool.query(`UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users)`);
      
      const catCount = await pool.query('SELECT COUNT(*) FROM categories');
      if (parseInt(catCount.rows[0].count) === 0) {
        await pool.query(`INSERT INTO categories (name) VALUES ('Rent'), ('Utility'), ('Installment'), ('Insurance'), ('Mobile Bill'), ('Gas'), ('Grocery'), ('Food'), ('Shopping'), ('Charging'), ('Personal Care'), ('Household'), ('Misc')`);
      }
      const accCount = await pool.query('SELECT COUNT(*) FROM account_types');
      if (parseInt(accCount.rows[0].count) === 0) { 
        await pool.query(`INSERT INTO account_types (name) VALUES ('Savings'), ('Checking'), ('Investment')`); 
      }

      // Seed AI query examples if none exist yet.
      // SQL values use date placeholders: {TODAY} {THIS_MONTH_START} {LAST_MONTH_START}
      // {LAST_MONTH_END} {LAST_TO_LAST_START} {LAST_TO_LAST_END}
      // These are replaced at query-time in the Telegram bot.
      const exCount = await pool.query('SELECT COUNT(*) FROM ai_query_examples');
      if (parseInt(exCount.rows[0].count) === 0) {
        const seeds = [
          { q: "What did I spend on groceries last month?", s: "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE category_id IN (SELECT id FROM categories WHERE name ILIKE '%grocery%') AND date >= '{LAST_MONTH_START}' AND date <= '{LAST_MONTH_END}'", d: "Total grocery spend for last month" },
          { q: "What was my biggest expense last month?", s: "SELECT e.amount, e.description, e.date, c.name AS category FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.date >= '{LAST_MONTH_START}' AND e.date <= '{LAST_MONTH_END}' ORDER BY e.amount DESC LIMIT 1", d: "Single largest expense last month" },
          { q: "What was my biggest expense two months ago?", s: "SELECT e.amount, e.description, e.date, c.name AS category FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.date >= '{LAST_TO_LAST_START}' AND e.date <= '{LAST_TO_LAST_END}' ORDER BY e.amount DESC LIMIT 1", d: "Single largest expense in last-to-last month" },
          { q: "Show me my top 5 expenses this month", s: "SELECT e.amount, e.description, e.date, c.name AS category FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.date >= '{THIS_MONTH_START}' AND e.date <= '{TODAY}' ORDER BY e.amount DESC LIMIT 5", d: "Top 5 biggest expenses this month" },
          { q: "What is my income and expense summary for last month?", s: "SELECT (SELECT COALESCE(SUM(amount), 0) FROM income WHERE date >= '{LAST_MONTH_START}' AND date <= '{LAST_MONTH_END}') AS total_income, (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= '{LAST_MONTH_START}' AND date <= '{LAST_MONTH_END}') AS total_expenses", d: "Income vs expenses summary for last month" },
          { q: "Can you provide last to last month income and expense summary?", s: "SELECT (SELECT COALESCE(SUM(amount), 0) FROM income WHERE date >= '{LAST_TO_LAST_START}' AND date <= '{LAST_TO_LAST_END}') AS total_income, (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= '{LAST_TO_LAST_START}' AND date <= '{LAST_TO_LAST_END}') AS total_expenses", d: "Income vs expenses summary for 2 months ago" },
          { q: "What is my income and expense summary for this month?", s: "SELECT (SELECT COALESCE(SUM(amount), 0) FROM income WHERE date >= '{THIS_MONTH_START}' AND date <= '{TODAY}') AS total_income, (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= '{THIS_MONTH_START}' AND date <= '{TODAY}') AS total_expenses", d: "Income vs expenses summary for this month" },
          { q: "What is my net savings this month?", s: "SELECT (SELECT COALESCE(SUM(amount), 0) FROM income WHERE date >= '{THIS_MONTH_START}' AND date <= '{TODAY}') - (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= '{THIS_MONTH_START}' AND date <= '{TODAY}') AS net_savings", d: "Net savings (income minus expenses) this month" },
          { q: "Am I saving money this month?", s: "SELECT (SELECT COALESCE(SUM(amount), 0) FROM income WHERE date >= '{THIS_MONTH_START}' AND date <= '{TODAY}') - (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= '{THIS_MONTH_START}' AND date <= '{TODAY}') AS net_savings", d: "Net savings check for this month" },
          { q: "Give me a category-wise breakdown of my spending this month", s: "SELECT c.name AS category, COALESCE(SUM(e.amount), 0) AS total FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.date >= '{THIS_MONTH_START}' AND e.date <= '{TODAY}' GROUP BY c.name ORDER BY total DESC", d: "Spending grouped by category this month" },
          { q: "Give me a category-wise breakdown for last month", s: "SELECT c.name AS category, COALESCE(SUM(e.amount), 0) AS total FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.date >= '{LAST_MONTH_START}' AND e.date <= '{LAST_MONTH_END}' GROUP BY c.name ORDER BY total DESC", d: "Spending grouped by category last month" },
          { q: "What did I spend the most on this year?", s: "SELECT c.name AS category, COALESCE(SUM(e.amount), 0) AS total FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.date >= DATE_TRUNC('year', CURRENT_DATE) GROUP BY c.name ORDER BY total DESC LIMIT 5", d: "Top 5 spending categories this year" },
          { q: "What did I spend month by month this year?", s: "SELECT TO_CHAR(DATE_TRUNC('month', date), 'Mon YYYY') AS month, COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date >= DATE_TRUNC('year', CURRENT_DATE) GROUP BY DATE_TRUNC('month', date) ORDER BY DATE_TRUNC('month', date)", d: "Monthly expense trend this year" },
          { q: "Compare my grocery spending this month vs last month", s: "SELECT (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE category_id IN (SELECT id FROM categories WHERE name ILIKE '%grocery%') AND date >= '{THIS_MONTH_START}' AND date <= '{TODAY}') AS this_month, (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE category_id IN (SELECT id FROM categories WHERE name ILIKE '%grocery%') AND date >= '{LAST_MONTH_START}' AND date <= '{LAST_MONTH_END}') AS last_month", d: "Grocery spend comparison this month vs last" },
          { q: "How much did I spend on food in the last 3 months?", s: "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE category_id IN (SELECT id FROM categories WHERE name ILIKE '%food%') AND date >= CURRENT_DATE - INTERVAL '3 months'", d: "Total food spend rolling 3 months" },
          { q: "How much did I spend on insurance in the past 6 months?", s: "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE category_id IN (SELECT id FROM categories WHERE name ILIKE '%insurance%') AND date >= CURRENT_DATE - INTERVAL '6 months'", d: "Total insurance spend rolling 6 months" },
          { q: "How much have I spent on medical in the last 3 months?", s: "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE category_id IN (SELECT id FROM categories WHERE name ILIKE '%medical%' OR name ILIKE '%health%' OR name ILIKE '%hospital%') AND date >= CURRENT_DATE - INTERVAL '3 months'", d: "Total medical/health spend rolling 3 months" },
          { q: "How much have I earned this month?", s: "SELECT COALESCE(SUM(amount), 0) AS total_income FROM income WHERE date >= '{THIS_MONTH_START}' AND date <= '{TODAY}'", d: "Total income this month" },
          { q: "Show me all my income sources this year", s: "SELECT source, COALESCE(SUM(amount), 0) AS total FROM income WHERE date >= DATE_TRUNC('year', CURRENT_DATE) GROUP BY source ORDER BY total DESC", d: "Income breakdown by source this year" },
          { q: "What was my highest income month this year?", s: "SELECT TO_CHAR(DATE_TRUNC('month', date), 'Mon YYYY') AS month, COALESCE(SUM(amount), 0) AS total FROM income WHERE date >= DATE_TRUNC('year', CURRENT_DATE) GROUP BY DATE_TRUNC('month', date) ORDER BY total DESC LIMIT 1", d: "Best earning month this year" },
          { q: "What is my total spending this year?", s: "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date >= DATE_TRUNC('year', CURRENT_DATE)", d: "Cumulative expenses since Jan 1" },
          { q: "What is my current account balance?", s: "SELECT sa.balance, b.name AS bank, sa.currency FROM savings_accounts sa LEFT JOIN banks b ON sa.bank_id = b.id ORDER BY sa.balance DESC", d: "All account balances with bank names" },
          { q: "How much have I lent out that hasn't been repaid?", s: "SELECT recipient, SUM(amount) AS total_lent FROM lending WHERE repaid = 0 GROUP BY recipient ORDER BY total_lent DESC", d: "Outstanding lending amounts per person" },
          { q: "What money have I transferred this month?", s: "SELECT recipient, amount, method, date FROM transfers WHERE date >= '{THIS_MONTH_START}' AND date <= '{TODAY}' ORDER BY date DESC LIMIT 20", d: "Transfers sent this month" },
          { q: "How many times did I eat out last month?", s: "SELECT COUNT(*) AS count FROM expenses WHERE category_id IN (SELECT id FROM categories WHERE name ILIKE '%restaurant%' OR name ILIKE '%dining%' OR name ILIKE '%food%') AND date >= '{LAST_MONTH_START}' AND date <= '{LAST_MONTH_END}'", d: "Number of dining/restaurant expenses last month" },
          { q: "What is my average monthly spend on utilities?", s: "SELECT ROUND(AVG(monthly_total)::numeric, 2) AS avg_monthly FROM (SELECT DATE_TRUNC('month', date) AS month, SUM(amount) AS monthly_total FROM expenses WHERE category_id IN (SELECT id FROM categories WHERE name ILIKE '%utility%' OR name ILIKE '%utilities%' OR name ILIKE '%electricity%') GROUP BY month) sub", d: "Average utility cost per month" },
          { q: "What were my recent expenses?", s: "SELECT e.amount, e.description, e.date, c.name AS category FROM expenses e LEFT JOIN categories c ON e.category_id = c.id ORDER BY e.date DESC LIMIT 10", d: "10 most recent expense entries" },
          { q: "How much did I spend last year?", s: "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date >= CURRENT_DATE - INTERVAL '1 year'", d: "Total expenses over the last 12 months" },
        ];
        for (const seed of seeds) {
          await pool.query('INSERT INTO ai_query_examples (question, sql_query, description) VALUES ($1, $2, $3)', [seed.q, seed.s, seed.d]);
        }
      }

      await initJwtSecret();
      break; 
    } catch (e) { 
      retries -= 1; 
      await new Promise(res => setTimeout(res, 3000)); 
    }
  }
};
runMigrations();

const isValidSqlFile = (filePath) => {
  try {
    const buffer = Buffer.alloc(2048); 
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 2048, 0); 
    fs.closeSync(fd);
    const snippet = buffer.toString('utf8', 0, bytesRead).toUpperCase();
    return snippet.includes('POSTGRESQL DATABASE DUMP') || snippet.includes('CREATE TABLE') || snippet.includes('INSERT INTO') || snippet.includes('ALTER TABLE');
  } catch (err) { return false; }
};

const sanitizeSqlFile = (filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/^\\restrict.*$/gm, '-- Removed restrict command');
    fs.writeFileSync(filePath, content);
  } catch (err) {}
};

const sendTelegramMessage = async (text) => {
  let token = process.env.TELEGRAM_BOT_TOKEN; 
  let chatId = process.env.TELEGRAM_CHAT_ID;
  
  try {
    const settings = await pool.query("SELECT key, value FROM system_settings WHERE key IN ('TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID')");
    const map = {}; settings.rows.forEach(r => map[r.key] = r.value);
    token = map['TELEGRAM_BOT_TOKEN'] || token; 
    chatId = map['TELEGRAM_CHAT_ID'] || chatId;
  } catch(e) {}
  
  if (!token || !chatId) return;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, { 
      chat_id: chatId, 
      text: text, 
      parse_mode: 'Markdown' 
    });
    console.log(`✅ [TELEGRAM] Message sent successfully!`);
  } catch (err) {
    console.warn(`⚠️ [TELEGRAM WARNING] Markdown rejected by Telegram. Attempting fallback... Error:`, err.response?.data?.description || err.message);
    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, { 
        chat_id: chatId, 
        text: text 
      });
      console.log(`✅ [TELEGRAM] Fallback message sent successfully (Raw Text)!`);
    } catch (fallbackErr) {
      console.error(`❌ [TELEGRAM CRITICAL ERROR] Failed to send message entirely:`, fallbackErr.response?.data || fallbackErr.message);
    }
  }
};

const logAction = async (details) => {
  try {
    const cleanDetails = details.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim();
    await pool.query('INSERT INTO audit_logs (action_details) VALUES ($1)', [cleanDetails]);
  } catch (err) {}
};

const notifyAdmin = async (message, sendToTelegram = false) => {
  try { 
    await pool.query('INSERT INTO notifications (message) VALUES ($1)', [message]); 
    await logAction(message);
    if (sendToTelegram) { 
      await sendTelegramMessage(message); 
    }
  } catch(e) {}
};

const isAuthenticated = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { 
    req.user = jwt.verify(token, JWT_SECRET); 
    next(); 
  } catch (err) { 
    res.status(401).json({ error: 'Invalid token' }); 
  }
};

const isAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { 
    const decoded = jwt.verify(token, JWT_SECRET); 
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' }); 
    req.user = decoded; 
    next(); 
  } catch (err) { 
    res.status(401).json({ error: 'Invalid token' }); 
  }
};

// ==========================================
// SYSTEM & AUTH ROUTES
// ==========================================

app.get('/api/system/status', async (req, res) => {
  try { 
    res.json({ isInitialized: parseInt((await pool.query('SELECT COUNT(*) FROM users')).rows[0].count) > 0 }); 
  } catch (err) { 
    res.json({ isInitialized: false }); 
  }
});

app.post('/api/system/reset', isAdmin, async (req, res) => {
  try {
    notifyAdmin(`⚠️ CRITICAL SECURITY ALERT: Factory Reset Initiated by Admin. All data is being wiped.`);
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await runMigrations();
    res.json({ success: true, message: "System Factory Reset Complete." });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.post('/api/system/soft-reset', isAdmin, async (req, res) => {
  try {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM income'); 
    await pool.query('DELETE FROM expenses'); 
    await pool.query('DELETE FROM transfers'); 
    await pool.query('DELETE FROM lending'); 
    await pool.query('DELETE FROM investment_logs'); 
    await pool.query('DELETE FROM investments'); 
    await pool.query('DELETE FROM ai_monthly_insights');
    await pool.query('UPDATE savings_accounts SET balance = 0'); 
    await pool.query('UPDATE credit_cards SET balance = 0'); 
    await pool.query('DELETE FROM notifications');
    await pool.query('COMMIT');
    notifyAdmin(`🧹 Soft Reset Complete: All transactional data has been cleared. System configuration remains intact.`, true);
    res.json({ success: true, message: "System Soft Reset Complete." });
  } catch (err) { 
    await pool.query('ROLLBACK'); 
    res.status(500).json({ error: err.message }); 
  }
});

app.get('/api/system/health', async (req, res) => {
  try {
    const start = Date.now(); 
    await pool.query('SELECT 1'); 
    const dbLatency = Date.now() - start;
    let recentLogs = []; 
    try { 
      recentLogs = fs.readFileSync('app-activity.log', 'utf-8').split('\n').filter(Boolean).slice(-50).map(JSON.parse).reverse(); 
    } catch(e) {}
    res.json({ 
      status: 'Operational', 
      metrics: { 
        database: dbLatency < 100 ? 'Healthy' : 'Degraded', 
        latency: `${dbLatency}ms`, 
        memoryUsage: `${Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100} MB`, 
        uptime: `${Math.round(process.uptime() / 60)} mins` 
      }, 
      logs: recentLogs 
    });
  } catch (err) { 
    res.status(500).json({ error: err.message, status: 'Critical Failure' }); 
  }
});

app.get('/api/system/docker-logs', isAdmin, async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const targetNames = ['vault_frontend', 'vault_backend', 'vault_db', 'vault_ollama', 'vault_nginx'];
    let allLogs = [];
    for (const containerInfo of containers) {
      const name = containerInfo.Names[0].replace('/', '');
      if (targetNames.includes(name)) {
        const container = docker.getContainer(containerInfo.Id);
        const logsBuffer = await container.logs({ stdout: true, stderr: true, tail: 200, timestamps: true });
        logsBuffer.toString('utf8').split('\n').forEach(line => {
          let cleanLine = line.replace(/^[\x00-\x1F]+/, '').trim();
          if (!cleanLine) return;
          const timeMatch = cleanLine.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)/);
          let timestamp = new Date().toISOString(); 
          let message = cleanLine;
          if (timeMatch) { timestamp = timeMatch[1]; message = timeMatch[2]; }
          let level = 'LOG'; 
          const msgLower = message.toLowerCase();
          if (msgLower.includes('error') || msgLower.includes('fatal') || msgLower.includes('panic') || msgLower.includes('fail')) level = 'ERROR';
          else if (msgLower.includes('warn')) level = 'WARN'; 
          else if (msgLower.includes('statement:')) level = 'STATEMENT'; 
          else if (msgLower.includes('detail:')) level = 'DETAIL';
          allLogs.push({ id: Math.random().toString(36).substr(2, 9), container: name, level: level, message: message, timestamp: timestamp });
        });
      }
    }
    allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(allLogs.slice(0, 800)); 
  } catch (err) { 
    res.status(500).json({ error: 'Failed to access Docker Daemon.' }); 
  }
});

app.post('/api/auth/register', async (req, res) => { 
  const { username, password, telegramToken, telegramChatId, ngrokToken } = req.body; 
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z\d!@#$%^&*(),.?":{}|<>]{12,}$/;
  if (!passwordRegex.test(password)) return res.status(400).json({ error: 'Security Policy: Password must be exactly 12 characters and contain letters, symbols, and numbers.' });

  try { 
    if ((await pool.query('SELECT * FROM users WHERE username = $1', [username])).rows.length > 0) return res.status(400).json({ error: 'Username exists' }); 
    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10)); 
    const isFirstUser = (await pool.query('SELECT COUNT(*) FROM users')).rows[0].count === '0';
    const role = isFirstUser ? 'admin' : 'user'; 
    const result = await pool.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role', [username, hashedPassword, role]); 
    
    if (isFirstUser) {
      if (telegramToken) await pool.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['TELEGRAM_BOT_TOKEN', telegramToken]);
      if (telegramChatId) await pool.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['TELEGRAM_CHAT_ID', telegramChatId]);
      if (ngrokToken) { 
        await pool.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['NGROK_TOKEN', ngrokToken]); 
        initializeTunnel(ngrokToken, telegramToken); 
      }
      if (telegramToken && telegramChatId) { 
        try { 
          await axios.post(`https://api.telegram.org/bot${telegramToken}/sendMessage`, { chat_id: telegramChatId, text: "✅ *Welcome to Vault.*\n\nYou have successfully enrolled in the Vault notification service.", parse_mode: 'Markdown' }); 
        } catch (err) {} 
      }
    }
    res.json(result.rows[0]); 
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  } 
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password, mfaToken } = req.body;
  try {
    const result = await pool.query('SELECT *, EXTRACT(EPOCH FROM (NOW() - COALESCE(password_changed_at, CURRENT_TIMESTAMP))) / 86400 AS days_since_change FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].password))) { 
      return res.status(400).json({ error: 'Invalid credentials' }); 
    }
    const user = result.rows[0];
    
    if (user.days_since_change >= 90) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await pool.query("UPDATE users SET reset_otp = $1, reset_otp_expires = NOW() + INTERVAL '10 minutes' WHERE id = $2", [otp, user.id]);
      return res.json({ passwordExpired: true, message: "Your password has expired (90-day policy). An OTP has been sent to your Telegram to perform a mandatory reset." });
    }
    
    if (user.mfa_enabled) {
      if (!mfaToken) return res.json({ mfaRequired: true });
      const isValid = authenticator.check(mfaToken, user.mfa_secret);
      if (!isValid) return res.status(400).json({ error: 'Invalid MFA Code' });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    notifyAdmin(`✅ User "${user.username}" with role "${user.role}" has logged in.`, true);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, mfa_enabled: user.mfa_enabled } });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { username } = req.body; 
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    const result = await pool.query("UPDATE users SET reset_otp = $1, reset_otp_expires = NOW() + INTERVAL '10 minutes' WHERE username = $2 RETURNING id", [otp, username]);
    if (result.rows.length > 0) {
      await sendTelegramMessage(`🔐 *Password Reset Requested*\nYour verification code is: \`${otp}\`\nThis code expires in 10 minutes.`);
    }
    res.json({ success: true, message: "If account exists, an OTP has been sent." });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { username, otp, newPassword } = req.body;
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z\d!@#$%^&*(),.?":{}|<>]{12,}$/;
  if (!passwordRegex.test(newPassword)) return res.status(400).json({ error: 'Security Policy: Password must be exactly 12 characters and contain letters, symbols, and numbers.' });

  try {
    const user = (await pool.query("SELECT * FROM users WHERE username = $1 AND reset_otp = $2 AND reset_otp_expires > NOW()", [username, otp])).rows[0];
    if (!user) return res.status(400).json({ error: "Invalid or expired OTP" });
    const history = await pool.query("SELECT password_hash FROM password_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 4", [user.id]);
    const pastHashes = [user.password, ...history.rows.map(r => r.password_hash)];
    let isReused = false; 
    for (let hash of pastHashes) { 
      if (await bcrypt.compare(newPassword, hash)) { isReused = true; break; } 
    }
    if (isReused) return res.status(400).json({ error: "Security Policy Block: You cannot reuse any of your last 5 passwords." });

    await pool.query("INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)", [user.id, user.password]);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = $1, reset_otp = NULL, password_changed_at = CURRENT_TIMESTAMP WHERE id = $2", [hashedPassword, user.id]);
    res.json({ success: true });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.post('/api/auth/mfa/generate', isAuthenticated, async (req, res) => { 
  try { 
    const secret = authenticator.generateSecret(); 
    const otpauthUrl = authenticator.keyuri(req.user.username, 'Vault', secret); 
    const qrCodeUrl = await qrcode.toDataURL(otpauthUrl); 
    res.json({ secret, qrCodeUrl }); 
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  } 
});

app.post('/api/auth/mfa/enable', isAuthenticated, async (req, res) => { 
  const { token, secret } = req.body; 
  try { 
    const isValid = authenticator.check(token, secret); 
    if (!isValid) return res.status(400).json({ error: 'Invalid token. Try again.' }); 
    await pool.query('UPDATE users SET mfa_secret = $1, mfa_enabled = TRUE WHERE id = $2', [secret, req.user.id]); 
    notifyAdmin(`🛡️ Security Update: Two-Factor Authentication (MFA) has been ENABLED for "${req.user.username}".`); 
    res.json({ success: true }); 
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  } 
});

app.post('/api/auth/mfa/disable', isAuthenticated, async (req, res) => { 
  try { 
    await pool.query('UPDATE users SET mfa_secret = NULL, mfa_enabled = FALSE WHERE id = $1', [req.user.id]); 
    notifyAdmin(`⚠️ CRITICAL ALERT: Two-Factor Authentication (MFA) has been DISABLED for "${req.user.username}".`); 
    res.json({ success: true }); 
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  } 
});

app.get('/api/users', isAdmin, async (req, res) => { 
  try { 
    res.json((await pool.query('SELECT id, username, role, mfa_enabled FROM users ORDER BY id ASC')).rows); 
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  } 
});

app.post('/api/users', isAdmin, async (req, res) => { 
  const { username, password, role } = req.body; 
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z\d!@#$%^&*(),.?":{}|<>]{12,}$/; 
  if (!passwordRegex.test(password)) return res.status(400).json({ error: 'Security Policy.' }); 
  try { 
    if ((await pool.query('SELECT * FROM users WHERE username = $1', [username])).rows.length > 0) return res.status(400).json({ error: 'Username exists' }); 
    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10)); 
    const result = await pool.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role', [username, hashedPassword, role || 'user']); 
    notifyAdmin(`🛡️ Security: New account "${username}" was created by Admin.`); 
    res.json(result.rows[0]); 
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  } 
});

app.delete('/api/users/:id', isAdmin, async (req, res) => { 
  try { 
    if (req.params.id === req.user.id.toString()) return res.status(400).json({ error: "Cannot delete yourself." }); 
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]); 
    res.json({ success: true }); 
  } catch (err) { 
    res.status(500).json({ error: "Cannot delete user. They may have linked records." }); 
  } 
});

app.get('/api/notifications', async (req, res) => { 
  res.json((await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 30')).rows); 
});

app.put('/api/notifications/:id/toggle', async (req, res) => { 
  await pool.query('UPDATE notifications SET is_read = NOT is_read WHERE id = $1', [req.params.id]); 
  res.json({ success: true }); 
});

app.delete('/api/notifications/clear', async (req, res) => { 
  await pool.query('DELETE FROM notifications'); 
  res.json({ success: true }); 
});

// ==========================================
// LEDGER CRUD ROUTES
// ==========================================

const createAdminRoutes = (endpoint, table) => { 
  app.post(`/api/${endpoint}`, isAdmin, async (req, res) => { 
    try { 
      const result = await pool.query(`INSERT INTO ${table} (name) VALUES ($1) RETURNING *`, [req.body.name]);
      await logAction(`System config added: [${table}] ${req.body.name}`);
      res.json(result.rows[0]);
    } catch (err) { 
      res.status(500).json({ error: err.message }); 
    } 
  }); 
  app.put(`/api/${endpoint}/:id`, isAdmin, async (req, res) => { 
    try { 
      res.json((await pool.query(`UPDATE ${table} SET name = $1 WHERE id = $2 RETURNING *`, [req.body.name, req.params.id])).rows[0]);
      await logAction(`System config modified: [${table}] ID ${req.params.id} changed to ${req.body.name}`);
    } catch (err) { 
      res.status(500).json({ error: err.message }); 
    } 
  }); 
  app.delete(`/api/${endpoint}/:id`, isAdmin, async (req, res) => { 
    try { 
      await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
      await logAction(`System config deleted: [${table}] ID ${req.params.id}`);
      res.json({ success: true });
    } catch (err) { 
      res.status(500).json({ error: `In use.` }); 
    } 
  }); 
};

app.get('/api/categories', async (req, res) => { try { res.json((await pool.query('SELECT * FROM categories ORDER BY name')).rows); } catch (err) { res.status(500).json({ error: err.message }); } });
createAdminRoutes('categories', 'categories'); 

app.get('/api/banks', async (req, res) => { try { res.json((await pool.query('SELECT * FROM banks ORDER BY name')).rows); } catch (err) { res.status(500).json({ error: err.message }); } });
createAdminRoutes('banks', 'banks'); 

app.get('/api/recipient-banks', async (req, res) => { try { res.json((await pool.query('SELECT * FROM recipient_banks ORDER BY name')).rows); } catch (err) { res.status(500).json({ error: err.message }); } });
createAdminRoutes('recipient-banks', 'recipient_banks'); 

app.get('/api/account-types', async (req, res) => { try { res.json((await pool.query('SELECT * FROM account_types ORDER BY name')).rows); } catch (err) { res.status(500).json({ error: err.message }); } });
createAdminRoutes('account-types', 'account_types');

app.get('/api/credit-cards', async (req, res) => { try { res.json((await pool.query('SELECT * FROM credit_cards ORDER BY name')).rows); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/credit-cards', isAdmin, async (req, res) => { try { res.json((await pool.query('INSERT INTO credit_cards (name, limit_amount) VALUES ($1, $2) RETURNING *', [req.body.name, req.body.limit_amount])).rows[0]); await logAction(`Credit Card minted: ${req.body.name}`); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/credit-cards/:id', isAdmin, async (req, res) => { try { res.json((await pool.query('UPDATE credit_cards SET name = $1, limit_amount = $2 WHERE id = $3 RETURNING *', [req.body.name, req.body.limit_amount, req.params.id])).rows[0]); await logAction(`Credit Card modified: ID ${req.params.id}`); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/credit-cards/:id', isAdmin, async (req, res) => { try { await pool.query('DELETE FROM credit_cards WHERE id = $1', [req.params.id]); await logAction(`Credit Card deleted: ID ${req.params.id}`); res.json({ success: true }); } catch (err) { res.status(500).json({ error: 'In use.' }); } });
app.post('/api/credit-cards/:id/repay', async (req, res) => { const { account_id, amount, date } = req.body;
    try { const ccName = (await pool.query('SELECT name FROM credit_cards WHERE id = $1', [req.params.id])).rows[0].name;
        if (account_id) await pool.query('UPDATE savings_accounts SET balance = balance - $1 WHERE id = $2', [amount, account_id]);
        await pool.query('UPDATE credit_cards SET balance = balance - $1 WHERE id = $2', [amount, req.params.id]);
        const transferResult = await pool.query('INSERT INTO transfers (source_account_id, recipient, amount, exchange_rate, inr_amount, method, date) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_DATE)) RETURNING *', [account_id || null, `CC: ${ccName}`, amount, 1.00, amount, 'Credit Card Repayment', date || null]);
        notifyAdmin(`Credit Card Repaid: C$${amount} to ${ccName}`);
        res.json(transferResult.rows[0]);
      } catch (err) { res.status(500).json({ error: err.message }); } });

app.get('/api/investments', async (req, res) => { try { res.json((await pool.query(`SELECT i.id, i.name, i.type, i.bank_id, i.account_type_id, b.name as bank_name, act.name as account_type_name, COALESCE((SELECT balance FROM investment_logs il WHERE il.investment_id = i.id AND il.status != 'DELETED' ORDER BY date DESC, id DESC LIMIT 1), 0) as current_balance, COALESCE((SELECT SUM(net_contribution) FROM investment_logs il WHERE il.investment_id = i.id AND il.status != 'DELETED'), 0) as total_contributed FROM investments i LEFT JOIN banks b ON i.bank_id = b.id LEFT JOIN account_types act ON i.account_type_id = act.id WHERE i.status != 'DELETED' ORDER BY i.id DESC`)).rows); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/investments', async (req, res) => { try { await pool.query('BEGIN'); const result = await pool.query('INSERT INTO investments (name, bank_id, account_type_id, type) VALUES ($1, $2, $3, $4) RETURNING *', [req.body.name, req.body.bank_id || null, req.body.account_type_id || null, req.body.type]);
        const newInv = result.rows[0];
        if (req.body.initial_amount && req.body.initial_amount !== '') {
            const logDate = req.body.date || new Date().toISOString().split('T')[0];
            await pool.query('INSERT INTO investment_logs (investment_id, date, balance, net_contribution) VALUES ($1, $2, $3, $4)', [newInv.id, logDate, req.body.initial_amount, req.body.initial_amount]);
        }
        await pool.query('COMMIT');
        notifyAdmin(`Investment Account Created: ${req.body.name}`);
        res.json(newInv);
    } catch (err) { await pool.query('ROLLBACK'); res.status(500).json({ error: err.message }); } });
app.delete('/api/investments/:id', async (req, res) => { try { const oldInv = (await pool.query(`SELECT i.name, i.type, COALESCE((SELECT balance FROM investment_logs il WHERE il.investment_id = i.id AND il.status != 'DELETED' ORDER BY date DESC, id DESC LIMIT 1), 0) as latest_amount FROM investments i WHERE i.id = $1`, [req.params.id])).rows[0];
        await pool.query(`UPDATE investments SET status='DELETED' WHERE id=$1`, [req.params.id]);
        if (oldInv) notifyAdmin(`🗑️ Investment asset "${oldInv.name}" (${oldInv.type}) worth C$${parseFloat(oldInv.latest_amount).toFixed(2)} has been deleted.`, true);
        res.json({success:true});
    } catch (e) { res.status(500).json({error: e.message}); } });

app.get('/api/investment-logs', async (req, res) => { try { res.json((await pool.query(`SELECT il.*, i.name as investment_name, i.type as investment_type FROM investment_logs il JOIN investments i ON il.investment_id = i.id WHERE i.status != 'DELETED' ORDER BY il.date DESC, il.id DESC`)).rows); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/investment-logs', async (req, res) => { try { const r = await pool.query('INSERT INTO investment_logs (investment_id, date, balance, net_contribution) VALUES ($1, $2, $3, $4) RETURNING *', [req.body.investment_id, req.body.date, req.body.balance, req.body.net_contribution || 0]);
        notifyAdmin(`Investment Logged: Month balance updated`);
        res.json(r.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/investment-logs/:id', async (req, res) => { try { await pool.query(`UPDATE investment_logs SET status='DELETED' WHERE id=$1`, [req.params.id]);
        res.json({success:true});
    } catch (e) { res.status(500).json({error: e.message}); } });

app.get('/api/savings', async (req, res) => { res.json((await pool.query(`SELECT s.*, b.name as bank_name, act.name as account_type FROM savings_accounts s JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id ORDER BY s.id DESC`)).rows); });
app.post('/api/savings', isAdmin, async (req, res) => { res.json((await pool.query('INSERT INTO savings_accounts (bank_id, account_type_id, currency, balance) VALUES ($1, $2, $3, $4) RETURNING *', [req.body.bank_id, req.body.account_type_id || null, req.body.currency, req.body.balance || 0.00])).rows[0]); notifyAdmin("New Bank Account Added."); });
app.put('/api/savings/:id', isAdmin, async (req, res) => { res.json((await pool.query('UPDATE savings_accounts SET bank_id=$1, account_type_id=$2, currency=$3, balance=$4 WHERE id=$5 RETURNING *', [req.body.bank_id, req.body.account_type_id || null, req.body.currency, req.body.balance, req.params.id])).rows[0]); });
app.delete('/api/savings/:id', isAdmin, async (req, res) => { try { const oldAcc = (await pool.query('SELECT b.name as bank_name, act.name as account_type FROM savings_accounts s JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id WHERE s.id = $1', [req.params.id])).rows[0];
        await pool.query('DELETE FROM savings_accounts WHERE id=$1', [req.params.id]);
        if (oldAcc) notifyAdmin(`🗑️ The bank account of type "${oldAcc.account_type || 'Unknown'}" from "${oldAcc.bank_name}" has been deleted.`, true);
        res.json({success: true});
    } catch (err) { res.status(500).json({ error: 'In use.' }); } });
app.post('/api/savings/internal-transfer', async (req, res) => { const { from_account_id, to_account_id, amount } = req.body;
    if (!from_account_id || !to_account_id || !amount) return res.status(400).json({ error: 'Missing details.' });
    try { await pool.query('BEGIN');
        const fromAcc = await pool.query('SELECT s.id, b.name as bank_name, act.name as account_type FROM savings_accounts s JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id WHERE s.id = $1', [from_account_id]);
        const toAcc = await pool.query('SELECT s.id, b.name as bank_name, act.name as account_type FROM savings_accounts s JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id WHERE s.id = $1', [to_account_id]);
        await pool.query('UPDATE savings_accounts SET balance = balance - $1 WHERE id = $2', [amount, from_account_id]);
        await pool.query('UPDATE savings_accounts SET balance = balance + $1 WHERE id = $2', [amount, to_account_id]);
        const toName = `${toAcc.rows[0].bank_name} ${toAcc.rows[0].account_type || ''}`;
        await pool.query('INSERT INTO transfers (source_account_id, recipient, amount, exchange_rate, inr_amount, method, date) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)', [from_account_id, toName.trim(), amount, 1.00, amount, 'Internal Transfer']);
        await pool.query('COMMIT');
        notifyAdmin(`Internal Transfer: Moved C$${amount}.`);
        res.json({ success: true });
    } catch (err) { await pool.query('ROLLBACK'); res.status(500).json({ error: err.message }); } });

app.get('/api/income', async (req, res) => { res.json((await pool.query(`SELECT i.*, b.name as bank_name, act.name as account_type FROM income i LEFT JOIN savings_accounts s ON i.account_id = s.id LEFT JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id ORDER BY i.date DESC`)).rows); });
app.post('/api/income', async (req, res) => { try { const result = await pool.query('INSERT INTO income (source, amount, account_id, date) VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE)) RETURNING *', [req.body.source, req.body.amount, req.body.account_id || null, req.body.date || null]);
        let targetName = 'Vault';
        if (req.body.account_id) {
            await pool.query('UPDATE savings_accounts SET balance = balance + $1 WHERE id = $2', [req.body.amount, req.body.account_id]);
            const accRes = await pool.query('SELECT b.name as bank_name, act.name as account_type FROM savings_accounts s JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id WHERE s.id = $1', [req.body.account_id]);
            if (accRes.rows.length > 0) targetName = `${accRes.rows[0].bank_name} (${accRes.rows[0].account_type || 'Account'})`;
        }
        notifyAdmin(`You received C$${parseFloat(req.body.amount).toFixed(2)} from ${req.body.source} into ${targetName}`);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/income/:id', async (req, res) => { try { await pool.query('BEGIN');
        const old = (await pool.query('SELECT * FROM income WHERE id = $1', [req.params.id])).rows[0];
        if (old.account_id) await pool.query('UPDATE savings_accounts SET balance = balance - $1 WHERE id = $2', [old.amount, old.account_id]);
        const result = await pool.query(`UPDATE income SET source=$1, amount=$2, account_id=$3, date=COALESCE($4, CURRENT_DATE), status='EDITED' WHERE id=$5 RETURNING *`, [req.body.source, req.body.amount, req.body.account_id || null, req.body.date || null, req.params.id]);
        if (req.body.account_id) await pool.query('UPDATE savings_accounts SET balance = balance + $1 WHERE id = $2', [req.body.amount, req.body.account_id]);
        await pool.query('COMMIT');
        notifyAdmin(`Income Modified.`);
        res.json(result.rows[0]);
    } catch (e) { await pool.query('ROLLBACK'); res.status(500).json({error: e.message}); } });
app.delete('/api/income/:id', async (req, res) => { try { await pool.query('BEGIN');
        const old = (await pool.query('SELECT i.*, b.name as bank, act.name as type, cc.name as cc_name FROM income i LEFT JOIN savings_accounts s ON i.account_id = s.id LEFT JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id LEFT JOIN credit_cards cc ON e.credit_card_id = cc.id WHERE i.id = $1', [req.params.id])).rows[0];
        if (!old) return res.status(404).json({error: "Not found"});
        if (old.account_id) await pool.query('UPDATE savings_accounts SET balance = balance - $1 WHERE id = $2', [old.amount, old.account_id]);
        if (old.credit_card_id) await pool.query('UPDATE credit_cards SET balance = balance - $1 WHERE id = $2', [old.amount, old.credit_card_id]);
        await pool.query(`UPDATE income SET status='DELETED' WHERE id=$1`, [req.params.id]);
        await pool.query('COMMIT');
        const source = old.bank ? `${old.bank} (${old.type})` : (old.cc_name ? `CC: ${old.cc_name}` : 'Unknown');
        notifyAdmin(`🗑️ Income from "${old.source}" of C$${parseFloat(old.amount).toFixed(2)} has been deleted from ${old.bank || 'Vault'}.`, true);
        res.json({success:true});
    } catch (e) { await pool.query('ROLLBACK'); res.status(500).json({error: e.message}); } });

app.get('/api/expenses', async (req, res) => { res.json((await pool.query(`SELECT e.*, c.name as category, b.name as bank_name, act.name as account_type, cc.name as credit_card_name FROM expenses e JOIN categories c ON e.category_id = c.id LEFT JOIN savings_accounts s ON e.account_id = s.id LEFT JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id LEFT JOIN credit_cards cc ON e.credit_card_id = cc.id ORDER BY e.date DESC`)).rows); });
app.post('/api/expenses', async (req, res) => { const { amount, category_id, account_id, credit_card_id, description, date } = req.body;
    try { const result = await pool.query('INSERT INTO expenses (amount, category_id, account_id, credit_card_id, description, date) VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE)) RETURNING *', [amount, category_id, account_id || null, credit_card_id || null, description, date || null]);
        if (account_id) await pool.query('UPDATE savings_accounts SET balance = balance - $1 WHERE id = $2', [amount, account_id]);
        else if (credit_card_id) await pool.query('UPDATE credit_cards SET balance = balance + $1 WHERE id = $2', [amount, credit_card_id]);
        let catName = 'Uncategorized';
        if (category_id) catName = (await pool.query('SELECT name FROM categories WHERE id = $1', [category_id])).rows[0]?.name || catName;
        let sourceName = 'Unknown Account';
        if (account_id) { const accRes = await pool.query('SELECT b.name as bank_name, act.name as account_type FROM savings_accounts s JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id WHERE s.id = $1', [account_id]);
            if (accRes.rows.length > 0) sourceName = `${accRes.rows[0].bank_name} (${accRes.rows[0].account_type || 'Account'})`;
        } else if (credit_card_id) { sourceName = (await pool.query('SELECT name FROM credit_cards WHERE id = $1', [credit_card_id])).rows[0]?.name || sourceName;
        }
        notifyAdmin(`You have spent C$${parseFloat(amount).toFixed(2)} on ${description ? `${description} (${catName})` : catName} from ${sourceName}`);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/expenses/:id', async (req, res) => { try { await pool.query('BEGIN');
        const old = (await pool.query('SELECT * FROM expenses WHERE id = $1', [req.params.id])).rows[0];
        if (old.account_id) await pool.query('UPDATE savings_accounts SET balance = balance + $1 WHERE id = $2', [old.amount, old.account_id]);
        if (old.credit_card_id) await pool.query('UPDATE credit_cards SET balance = balance - $1 WHERE id = $2', [old.amount, old.credit_card_id]);
        const { amount, category_id, account_id, credit_card_id, description, date } = req.body;
        const result = await pool.query(`UPDATE expenses SET amount=$1, category_id=$2, account_id=$3, credit_card_id=$4, description=$5, date=COALESCE($6, CURRENT_DATE), status='EDITED' WHERE id=$7 RETURNING *`, [amount, category_id, account_id || null, credit_card_id || null, description, date || null, req.params.id]);
        if (account_id) await pool.query('UPDATE savings_accounts SET balance = balance - $1 WHERE id = $2', [amount, account_id]);
        if (credit_card_id) await pool.query('UPDATE credit_cards SET balance = balance + $1 WHERE id = $2', [amount, credit_card_id]);
        await pool.query('COMMIT');
        res.json(result.rows[0]);
    } catch (e) { await pool.query('ROLLBACK'); res.status(500).json({error: e.message}); } });
app.delete('/api/expenses/:id', async (req, res) => { try { await pool.query('BEGIN');
        const old = (await pool.query('SELECT e.*, c.name as cat, b.name as bank, act.name as type, cc.name as cc_name FROM expenses e JOIN categories c ON e.category_id = c.id LEFT JOIN savings_accounts s ON e.account_id = s.id LEFT JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id LEFT JOIN credit_cards cc ON e.credit_card_id = cc.id WHERE e.id = $1', [req.params.id])).rows[0];
        if (!old) return res.status(404).json({error: "Not found"});
        if (old.account_id) await pool.query('UPDATE savings_accounts SET balance = balance + $1 WHERE id = $2', [old.amount, old.account_id]);
        if (old.credit_card_id) await pool.query('UPDATE credit_cards SET balance = balance - $1 WHERE id = $2', [old.amount, old.credit_card_id]);
        await pool.query(`UPDATE expenses SET status='DELETED' WHERE id=$1`, [req.params.id]);
        await pool.query('COMMIT');
        const source = old.bank ? `${old.bank} (${old.type})` : (old.cc_name ? `CC: ${old.cc_name}` : 'Unknown');
        notifyAdmin(`🗑️ Expense on "${old.description || old.cat}" of C$${parseFloat(old.amount).toFixed(2)} has been deleted. The amount C$${parseFloat(old.amount).toFixed(2)} has been re-added to ${source}.`, true);
        res.json({success:true});
    } catch (e) { await pool.query('ROLLBACK'); res.status(500).json({error: e.message}); } });

app.get('/api/transfers', async (req, res) => { res.json((await pool.query(`SELECT t.*, rb.name as recipient_bank, b.name as source_bank, act.name as source_account_type FROM transfers t LEFT JOIN savings_accounts s ON t.source_account_id = s.id LEFT JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id LEFT JOIN recipient_banks rb ON t.recipient_bank_id = rb.id ORDER BY t.date DESC`)).rows); });
app.post('/api/transfers', async (req, res) => { try { const inr_amount = req.body.amount * req.body.exchange_rate;
        const result = await pool.query('INSERT INTO transfers (source_account_id, recipient, recipient_bank_id, amount, exchange_rate, inr_amount, method, date) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, CURRENT_DATE)) RETURNING *', [req.body.source_account_id || null, req.body.recipient, req.body.recipient_bank_id || null, req.body.amount, req.body.exchange_rate, inr_amount, req.body.method, req.body.date || null]);
        if (req.body.source_account_id) await pool.query('UPDATE savings_accounts SET balance = balance - $1 WHERE id = $2', [req.body.amount, req.body.source_account_id]);
        notifyAdmin(`Transfer Logged.`);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/transfers/:id', async (req, res) => { try { await pool.query('BEGIN');
        const old = (await pool.query('SELECT * FROM transfers WHERE id = $1', [req.params.id])).rows[0];
        if (old.source_account_id) await pool.query('UPDATE savings_accounts SET balance = balance + $1 WHERE id = $2', [old.amount, old.source_account_id]);
        if (old.method === 'Credit Card Repayment') await pool.query('UPDATE credit_cards SET balance = balance + $1 WHERE name = $2', [old.amount, old.recipient.replace('CC: ', '')]);
        const { source_account_id, recipient, recipient_bank_id, amount, exchange_rate, method, date } = req.body;
        const inr_amount = amount * (exchange_rate || 1);
        const result = await pool.query(`UPDATE transfers SET source_account_id=$1, recipient=$2, recipient_bank_id=$3, amount=$4, exchange_rate=$5, inr_amount=$6, method=$7, date=COALESCE($8, CURRENT_DATE), status='EDITED' WHERE id=$9 RETURNING *`, [source_account_id || null, recipient, recipient_bank_id || null, amount, exchange_rate || 1, inr_amount, method, date || null, req.params.id]);
        if (source_account_id) await pool.query('UPDATE savings_accounts SET balance = balance - $1 WHERE id = $2', [amount, source_account_id]);
        if (method === 'Credit Card Repayment') await pool.query('UPDATE credit_cards SET balance = balance - $1 WHERE name = $2', [amount, recipient.replace('CC: ', '')]);
        await pool.query('COMMIT');
        res.json(result.rows[0]);
    } catch (e) { await pool.query('ROLLBACK'); res.status(500).json({error: e.message}); } });
app.delete('/api/transfers/:id', async (req, res) => { try { await pool.query('BEGIN');
        const old = (await pool.query('SELECT t.*, b.name as bank FROM transfers t LEFT JOIN savings_accounts s ON t.source_account_id = s.id LEFT JOIN banks b ON s.bank_id = b.id WHERE t.id = $1', [req.params.id])).rows[0];
        if (old.source_account_id) await pool.query('UPDATE savings_accounts SET balance = balance + $1 WHERE id = $2', [old.amount, old.source_account_id]);
        if (old.method === 'Credit Card Repayment') await pool.query('UPDATE credit_cards SET balance = balance + $1 WHERE name = $2', [old.amount, old.recipient.replace('CC: ', '')]);
        await pool.query(`UPDATE transfers SET status='DELETED' WHERE id=$1`, [req.params.id]);
        await pool.query('COMMIT');
        if (old) notifyAdmin(`🗑️ Transfer of C$${parseFloat(old.amount).toFixed(2)} to "${old.recipient}" has been deleted. Funds reverted to ${old.bank || 'Vault'}.`, true);
        res.json({success:true});
    } catch (e) { await pool.query('ROLLBACK'); res.status(500).json({error: e.message}); } });

app.get('/api/lending', async (req, res) => { res.json((await pool.query(`SELECT l.*, b.name as source_bank, act.name as source_account_type, rb.name as recipient_bank_name FROM lending l LEFT JOIN savings_accounts s ON l.source_account_id = s.id LEFT JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id LEFT JOIN recipient_banks rb ON l.recipient_bank_id = rb.id ORDER BY l.date DESC`)).rows); });
app.post('/api/lending', async (req, res) => { try { const result = await pool.query('INSERT INTO lending (source_account_id, recipient, recipient_bank_id, amount, method, date) VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE)) RETURNING *', [req.body.source_account_id || null, req.body.recipient, req.body.recipient_bank_id || null, req.body.amount, req.body.method, req.body.date || null]);
        if (req.body.source_account_id) await pool.query('UPDATE savings_accounts SET balance = balance - $1 WHERE id = $2', [req.body.amount, req.body.source_account_id]);
        notifyAdmin(`Loan Issued.`);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/lending/:id', async (req, res) => { try { await pool.query('BEGIN');
        const old = (await pool.query('SELECT * FROM lending WHERE id = $1', [req.params.id])).rows[0];
        if (old.source_account_id) await pool.query('UPDATE savings_accounts SET balance = balance + $1 WHERE id = $2', [old.amount, old.source_account_id]);
        const { source_account_id, recipient, recipient_bank_id, amount, method, date } = req.body;
        const result = await pool.query(`UPDATE lending SET source_account_id=$1, recipient=$2, recipient_bank_id=$3, amount=$4, method=$5, date=COALESCE($6, CURRENT_DATE), status='EDITED' WHERE id=$7 RETURNING *`, [source_account_id || null, recipient, recipient_bank_id || null, amount, method, date || null, req.params.id]);
        if (source_account_id) await pool.query('UPDATE savings_accounts SET balance = balance - $1 WHERE id = $2', [amount, source_account_id]);
        await pool.query('COMMIT');
        res.json(result.rows[0]);
    } catch (e) { await pool.query('ROLLBACK'); res.status(500).json({error: e.message}); } });
app.delete('/api/lending/:id', async (req, res) => { try { await pool.query('BEGIN');
        const old = (await pool.query('SELECT l.*, b.name as bank FROM lending l LEFT JOIN savings_accounts s ON l.source_account_id = s.id LEFT JOIN banks b ON s.bank_id = b.id WHERE l.id = $1', [req.params.id])).rows[0];
        if (old.source_account_id) await pool.query('UPDATE savings_accounts SET balance = balance + $1 WHERE id = $2', [old.amount, old.source_account_id]);
        await pool.query(`UPDATE lending SET status='DELETED' WHERE id=$1`, [req.params.id]);
        await pool.query('COMMIT');
        if (old) notifyAdmin(`🗑️ Loan record of C$${parseFloat(old.amount).toFixed(2)} to "${old.recipient}" has been deleted. Funds reverted to ${old.bank || 'Vault'}.`, true);
        res.json({success:true});
    } catch (e) { await pool.query('ROLLBACK'); res.status(500).json({error: e.message}); } });

// ==========================================
// BACKUPS & SYSTEM LOGIC
// ==========================================

app.get('/api/logs', isAdmin, async (req, res) => { 
  res.json((await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50')).rows); 
});

const performBackup = async (notes, isAuto = false) => {
    const version = `v${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}`;
    const filename = `vault_backup_${version}.sql`;
    const filepath = `${BACKUP_DIR}/${filename}`;
    const user = process.env.DB_USER || 'admin'; 
    const pass = process.env.DB_PASSWORD || 'J#nish2275'; 
    const host = process.env.DB_HOST || 'db'; 
    const db = process.env.DB_NAME || 'initial_db';

    const dbUri = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}/${db}`;
    return new Promise((resolve, reject) => {
        exec(`pg_dump -c --if-exists "${dbUri}" -f "${filepath}"`, { maxBuffer: 1024 * 1024 * 500 }, async (error) => {
            if (error) {
                reject(error);
            } else {
                await pool.query('INSERT INTO system_backups (version, filename, notes) VALUES ($1, $2, $3)', [version, filename, notes]);
                resolve(version);
            }
        });
    });
};

app.get('/api/backups', isAdmin, async (req, res) => {
    try { res.json((await pool.query('SELECT id, version, filename, notes, created_at FROM system_backups ORDER BY created_at DESC')).rows); } 
    catch(e) { res.status(500).json({error: e.message}); }
});

app.post('/api/backups/manual', isAdmin, async (req, res) => {
    try {
        const version = await performBackup(req.body.notes || 'Manual backup executed by admin.');
        res.json({ success: true, version });
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.delete('/api/backups/:id', isAdmin, async (req, res) => {
    try {
        const b = await pool.query('SELECT filename, version FROM system_backups WHERE id = $1', [req.params.id]);
        if(b.rows.length > 0) {
            const filepath = `${BACKUP_DIR}/${b.rows[0].filename}`;
            if(fs.existsSync(filepath)) fs.unlinkSync(filepath);
            await pool.query('DELETE FROM system_backups WHERE id = $1', [req.params.id]);
            await logAction(`Backup deleted: ${b.rows[0].version}`);
        }
        res.json({success:true});
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.post('/api/backups/restore/:id', isAdmin, async (req, res) => {
    try {
        const b = await pool.query('SELECT filename, version FROM system_backups WHERE id = $1', [req.params.id]);
        if(b.rows.length === 0) return res.status(404).json({error: "Backup not found"});
        const filepath = `${BACKUP_DIR}/${b.rows[0].filename}`;
        
        sanitizeSqlFile(filepath);
        await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

        const user = process.env.DB_USER || 'admin'; const pass = process.env.DB_PASSWORD || 'J#nish2275'; const host = process.env.DB_HOST || 'db'; const db = process.env.DB_NAME || 'initial_db';
        const dbUri = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}/${db}`;
        
        exec(`psql -q "${dbUri}" -f "${filepath}"`, { maxBuffer: 1024 * 1024 * 500 }, async (error, stdout, stderr) => {
            try {
                await runMigrations(); 
                const userCheck = await pool.query('SELECT COUNT(*) FROM users');
                if (parseInt(userCheck.rows[0].count) === 0) throw new Error("Database remains empty.");
                await initJwtSecret();
                res.json({success:true});
            } catch (dbErr) {
                await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
                await runMigrations();
                res.status(500).json({error: "Restore failed."});
            }
        });
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.get('/api/backups/download/:id', isAdmin, async (req, res) => {
    try {
        const b = await pool.query('SELECT filename, version FROM system_backups WHERE id = $1', [req.params.id]);
        if(b.rows.length > 0) res.download(`${BACKUP_DIR}/${b.rows[0].filename}`, `vault_backup_${b.rows[0].version}.sql`);
        else res.status(404).send('Not found');
    } catch(e) { res.status(500).send('Error'); }
});

app.get('/api/system-settings/backup', isAdmin, async (req, res) => {
    try {
        const settings = await pool.query("SELECT key, value FROM system_settings WHERE key IN ('BACKUP_FREQ', 'BACKUP_TIME', 'BACKUP_DAY')");
        const map = { BACKUP_FREQ: 'none', BACKUP_TIME: '02:00', BACKUP_DAY: '1' };
        settings.rows.forEach(r => map[r.key] = r.value);
        res.json(map);
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.post('/api/system-settings/backup', isAdmin, async (req, res) => {
    const { freq, time, day } = req.body;
    try {
        await pool.query('BEGIN');
        await pool.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['BACKUP_FREQ', freq]);
        await pool.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['BACKUP_TIME', time]);
        await pool.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['BACKUP_DAY', day]);
        await pool.query('COMMIT');
        await logAction(`Backup schedule updated: ${freq} at ${time}`);
        res.json({success:true});
    } catch(e) { await pool.query('ROLLBACK'); res.status(500).json({error: e.message}); }
});

cron.schedule('* * * * *', async () => {
    try {
        const settings = await pool.query("SELECT key, value FROM system_settings WHERE key IN ('BACKUP_FREQ', 'BACKUP_TIME', 'BACKUP_DAY')");
        const map = {}; settings.rows.forEach(r => map[r.key] = r.value);
        if (!map['BACKUP_FREQ'] || map['BACKUP_FREQ'] === 'none' || !map['BACKUP_TIME']) return;

        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        if (currentTime === map['BACKUP_TIME']) {
            let shouldBackup = false;
            if (map['BACKUP_FREQ'] === 'daily') shouldBackup = true;
            else if (map['BACKUP_FREQ'] === 'weekly' && now.getDay().toString() === map['BACKUP_DAY']) shouldBackup = true;
            else if (map['BACKUP_FREQ'] === 'monthly' && now.getDate().toString() === map['BACKUP_DAY']) shouldBackup = true;

            if (shouldBackup) await performBackup('Scheduled backup performed as per user configuration.', true);
        }
    } catch(err) {}
});

app.post('/api/restore', isAdmin, upload.single('backup'), async (req, res) => {
  if (!req.file || !isValidSqlFile(req.file.path)) { 
      if (req.file) fs.unlinkSync(req.file.path); 
      return res.status(400).json({ error: "Invalid backup file." }); 
  }
  
  sanitizeSqlFile(req.file.path);

  const user = process.env.DB_USER || 'admin'; const pass = process.env.DB_PASSWORD || 'J#nish2275'; const host = process.env.DB_HOST || 'db'; const db = process.env.DB_NAME || 'initial_db';
  
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

  const dbUri = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}/${db}`;
  exec(`psql -q "${dbUri}" -f "${req.file.path}"`, { maxBuffer: 1024 * 1024 * 500 }, async (error, stdout, stderr) => { 
    fs.unlinkSync(req.file.path); 
    try {
        await runMigrations();
        const userCheck = await pool.query('SELECT COUNT(*) FROM users');
        if (parseInt(userCheck.rows[0].count) === 0) throw new Error("Database remains empty.");
        
        await pool.query(`UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users)`);
        await initJwtSecret();
        await notifyAdmin(`🔄 System Database successfully restored from external file.`, true);
        if (typeof runHistoricalBackfill === 'function') setTimeout(runHistoricalBackfill, 3000);
        res.json({ success: true }); 
    } catch (dbErr) {
        logger.error(`External Restore Verification Failed: ${dbErr.message}`);
        await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
        await runMigrations();
        res.status(500).json({ error: "Data Import Failed. The SQL file may be corrupt or incompatible." });
    }
  });
});

// ==========================================
// MONTHLY REPORT GENERATOR
// ==========================================

const generateMonthlyReportData = async () => {
    const now = new Date();
    const currentMonthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    const inc = await pool.query(`SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(amount) as total FROM income WHERE status != 'DELETED' GROUP BY month`);
    const exp = await pool.query(`SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(amount) as total FROM expenses WHERE status != 'DELETED' GROUP BY month`);
    const catQuery = await pool.query(`
        SELECT TO_CHAR(e.date, 'YYYY-MM') as month, c.name as category, SUM(e.amount) as total 
        FROM expenses e 
        JOIN categories c ON e.category_id = c.id 
        WHERE e.status != 'DELETED'
        GROUP BY month, category`);

    const txQuery = await pool.query(`
      SELECT month, account_name, COUNT(*) as tx_count FROM (
        SELECT TO_CHAR(date, 'YYYY-MM') as month, b.name || COALESCE(' ' || act.name, '') as account_name FROM income i JOIN savings_accounts s ON i.account_id = s.id JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id WHERE i.status != 'DELETED' AND i.account_id IS NOT NULL
        UNION ALL
        SELECT TO_CHAR(date, 'YYYY-MM') as month, b.name || COALESCE(' ' || act.name, '') as account_name FROM expenses e JOIN savings_accounts s ON e.account_id = s.id JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id WHERE e.status != 'DELETED' AND e.account_id IS NOT NULL
        UNION ALL
        SELECT TO_CHAR(date, 'YYYY-MM') as month, 'CC: ' || cc.name as account_name FROM expenses e JOIN credit_cards cc ON e.credit_card_id = cc.id WHERE e.status != 'DELETED' AND e.credit_card_id IS NOT NULL
        UNION ALL
        SELECT TO_CHAR(date, 'YYYY-MM') as month, b.name || COALESCE(' ' || act.name, '') as account_name FROM transfers t JOIN savings_accounts s ON t.source_account_id = s.id JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id WHERE t.status != 'DELETED' AND t.source_account_id IS NOT NULL
        UNION ALL
        SELECT TO_CHAR(date, 'YYYY-MM') as month, b.name || COALESCE(' ' || act.name, '') as account_name FROM lending l JOIN savings_accounts s ON l.source_account_id = s.id JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id WHERE l.status != 'DELETED' AND l.source_account_id IS NOT NULL
      ) all_txs GROUP BY month, account_name
    `);

    const expDetails = await pool.query(`SELECT TO_CHAR(e.date, 'YYYY-MM') as month, c.name as category, e.amount, e.description, e.date FROM expenses e JOIN categories c ON e.category_id = c.id WHERE e.status != 'DELETED' ORDER BY e.amount DESC`);
    const incDetails = await pool.query(`SELECT TO_CHAR(date, 'YYYY-MM') as month, source, amount, date FROM income WHERE status != 'DELETED' ORDER BY amount DESC`);
    const transferDetails = await pool.query(`SELECT TO_CHAR(date, 'YYYY-MM') as month, recipient, amount, method FROM transfers WHERE status != 'DELETED' ORDER BY amount DESC`);
    const loanDetails = await pool.query(`SELECT TO_CHAR(date, 'YYYY-MM') as month, recipient, amount, method FROM lending WHERE status != 'DELETED' ORDER BY amount DESC`);

    const invLogs = await pool.query(`
        WITH RankedLogs AS (
            SELECT investment_id, i.name as inv_name, TO_CHAR(il.date, 'YYYY-MM') as month, il.balance, il.net_contribution,
                   ROW_NUMBER() OVER(PARTITION BY investment_id, TO_CHAR(il.date, 'YYYY-MM') ORDER BY il.date DESC, il.id DESC) as rn
            FROM investment_logs il
            JOIN investments i ON il.investment_id = i.id
            WHERE il.status != 'DELETED'
        )
        SELECT investment_id, inv_name, month, balance, net_contribution FROM RankedLogs WHERE rn = 1 ORDER BY month DESC
    `);

    const aiInsights = await pool.query(`SELECT month, insights FROM ai_monthly_insights`);

    const monthsMap = {};
    const getMonthData = (m) => { 
        if (!monthsMap[m]) monthsMap[m] = { 
            month: m, income: 0, expense: 0, categories: {}, accounts: {}, 
            topExpenses: [], topIncome: [], transfers: [], loans: [], investments: [],
            ai_insight: null, isCurrentMonth: m === currentMonthStr
        }; 
        return monthsMap[m]; 
    };

    inc.rows.forEach(r => getMonthData(r.month).income = parseFloat(r.total));
    exp.rows.forEach(r => getMonthData(r.month).expense = parseFloat(r.total));
    catQuery.rows.forEach(r => {
        const monthData = getMonthData(r.month);
        if (!monthData.categories[r.category]) {
            monthData.categories[r.category] = 0; // Ensure all categories are listed
        }
        monthData.categories[r.category] += parseFloat(r.total);
    });
    txQuery.rows.forEach(r => getMonthData(r.month).accounts[r.account_name] = parseInt(r.tx_count));
    expDetails.rows.forEach(r => { const m = getMonthData(r.month); if(m.topExpenses.length < 15) m.topExpenses.push({ cat: r.category, desc: r.description, amt: parseFloat(r.amount) }); });
    incDetails.rows.forEach(r => { const m = getMonthData(r.month); if(m.topIncome.length < 10) m.topIncome.push({ src: r.source, amt: parseFloat(r.amount) }); });
    transferDetails.rows.forEach(r => { const m = getMonthData(r.month); if(m.transfers.length < 10) m.transfers.push({ to: r.recipient, amt: parseFloat(r.amount) }); });
    loanDetails.rows.forEach(r => { const m = getMonthData(r.month); if(m.loans.length < 10) m.loans.push({ to: r.recipient, amt: parseFloat(r.amount) }); });

    aiInsights.rows.forEach(r => { getMonthData(r.month).ai_insight = r.insights; });

    // Filter out ghost months — months that have no income AND no expenses (e.g. from investment/transfer activity only)
    let sortedMonths = Object.values(monthsMap)
        .filter(m => m.income > 0 || m.expense > 0)
        .sort((a,b) => b.month.localeCompare(a.month));

    for(let i = 0; i < sortedMonths.length; i++) {
        let current = sortedMonths[i]; 
        current.net = current.income - current.expense; 
        current.savingsRate = current.income > 0 ? ((current.net / current.income) * 100).toFixed(1) : 0;
        
        if (i < sortedMonths.length - 1) {
            let prev = sortedMonths[i+1]; 
            current.incomeGrowth = prev.income > 0 ? (((current.income - prev.income) / prev.income) * 100).toFixed(1) : 0; 
            current.expenseGrowth = prev.expense > 0 ? (((current.expense - prev.expense) / prev.expense) * 100).toFixed(1) : 0;
            // Only show categories that have actual expenses in the current month
            const allCats = new Set(Object.keys(current.categories));
            current.catComparison = Array.from(allCats).map(cat => {
                const currAmt = parseFloat(parseFloat(current.categories[cat] || 0).toFixed(2));
                const prevAmt = parseFloat(parseFloat(prev.categories[cat] || 0).toFixed(2));
                const diff = parseFloat((currAmt - prevAmt).toFixed(2));
                const pct = prevAmt > 0 ? parseFloat(((diff / prevAmt) * 100).toFixed(1)) : (currAmt > 0 ? 100 : 0);
                return { category: cat, current: currAmt, previous: prevAmt, diff, pct };
            }).sort((a, b) => b.current - a.current);
        } else {
            current.incomeGrowth = 0; current.expenseGrowth = 0;
            current.catComparison = Object.keys(current.categories).map(cat => {
                const currAmt = parseFloat(current.categories[cat]);
                return { category: cat, current: currAmt, previous: 0, diff: currAmt, pct: 100 };
            }).sort((a, b) => b.current - a.current);
        }

        const currLogs = invLogs.rows.filter(r => r.month === current.month);
        currLogs.forEach(cl => {
            let prevBalance = 0;
            const pastLogs = invLogs.rows.filter(r => r.investment_id === cl.investment_id && r.month < current.month);
            if (pastLogs.length > 0) prevBalance = parseFloat(pastLogs.sort((a,b) => b.month.localeCompare(a.month))[0].balance);
            const balance = parseFloat(cl.balance); const contrib = parseFloat(cl.net_contribution); const gainLoss = balance - prevBalance - contrib;
            current.investments.push({ name: cl.inv_name, balance, contrib, prevBalance, gainLoss });
        });
    }
    return sortedMonths;
};

app.get('/api/reports/monthly', async (req, res) => { try { res.json(await generateMonthlyReportData()); } catch(e) { res.status(500).json({ error: e.message }); } });

const runHistoricalBackfill = async () => {
  try {
    const allData = await generateMonthlyReportData();
    const now = new Date();
    const currentMonthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const pastMonthsData = allData.filter(d => d.month < currentMonthStr);
    let processedCount = 0;

    const userRes = await pool.query('SELECT username FROM users ORDER BY id ASC LIMIT 1');
    const clientName = userRes.rows.length > 0 ? userRes.rows[0].username : 'Valued Client';

    for (const monthData of pastMonthsData) {
      const existing = await pool.query('SELECT insights FROM ai_monthly_insights WHERE month = $1', [monthData.month]);
      
      if (existing.rows.length === 0) {
        const promptBrief = `
          You are Vittaparāmarśadātā, an elite AI financial advisor built into the Dhanapālana platform.
          Analyze the finalized financial data for ${monthData.month}.
          
          CRITICAL RULE: The client's name is ${clientName}. Address the client directly using their name, "you", and "your". Refer to yourself as "I" or "Vittaparāmarśadātā". Do NOT say the data belongs to Vittaparāmarśadātā.

          DATA SUMMARY:
          - Net Cash Flow: $${parseFloat(monthData.net || 0).toFixed(2)} (Savings Rate: ${monthData.savingsRate || 0}%)
          - Total Income: $${parseFloat(monthData.income || 0).toFixed(2)}
          - Total Expenses: $${parseFloat(monthData.expense || 0).toFixed(2)}
          - Expense Growth vs Last Month: ${monthData.expenseGrowth || 0}%

          CATEGORY CHANGES (VS LAST MONTH):
          ${monthData.catComparison && monthData.catComparison.length > 0 ? monthData.catComparison.slice(0,4).map(c => `- ${c.category}: You spent $${c.current} (Difference: ${c.diff > 0 ? '+' : ''}$${c.diff} / ${c.pct}% change)`).join('\n') : 'No comparison data.'}

          INVESTMENT PERFORMANCE:
          ${monthData.investments && monthData.investments.length > 0 ? monthData.investments.map(i => `- ${i.name}: Closing Balance $${i.balance}, New Contribution $${i.contrib}, Gain/Loss $${parseFloat(i.gainLoss || 0).toFixed(2)}`).join('\n') : 'No active investments.'}

          Please provide your response in 3 brief sections:
          1. Executive Summary (2 sentences max).
          2. Specific Observations (2-3 bullet points calling out specific numbers from the category changes or investments).
          3. Actionable Recommendation (1 bullet point).
        `;

        try {
          const aiResult = await generateText({
            model: ollama('vault-coder'),
            prompt: promptBrief,
            system: "You are Vittaparāmarśadātā, a professional financial advisor. Speak directly to the client. Do not output raw JSON."
          });
          await pool.query('INSERT INTO ai_monthly_insights (month, insights) VALUES ($1, $2)', [monthData.month, aiResult.text]);
          processedCount++;
          await new Promise(resolve => setTimeout(resolve, 10000));
        } catch (aiErr) {}
      }
    }

    if (processedCount > 0) {
      await notifyAdmin(`✅ *Historical Backfill Complete*\n\nVittaparāmarśadātā has successfully analyzed and generated reports for ${processedCount} past month(s). Log in to download your official PDF reports!`, true);
    }
  } catch (error) {}
};

app.post('/api/reports/analyze/:month', async (req, res) => {
    try {
        const targetMonth = req.params.month;
        const now = new Date();
        const currentMonthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

        if (targetMonth === currentMonthStr) { return res.status(400).json({error: "The current month is still active and cannot be analyzed yet."}); }

        const reports = await generateMonthlyReportData();
        const report = reports.find(r => r.month === targetMonth);
        if (!report) return res.status(404).json({error: "Report data not found for this month."});
        
        const existing = await pool.query('SELECT insights FROM ai_monthly_insights WHERE month = $1', [targetMonth]);
        if (existing.rows.length > 0) return res.status(400).json({error: "Insights already exist for this month."});

        const userRes = await pool.query('SELECT username FROM users ORDER BY id ASC LIMIT 1');
        const clientName = userRes.rows.length > 0 ? userRes.rows[0].username : 'Valued Client';

        const promptBrief = `
          You are Vittaparāmarśadātā, an elite AI financial advisor built into the Dhanapālana platform.
          Analyze the finalized financial data for ${targetMonth}.
          
          CRITICAL RULE: The client's name is ${clientName}. Address the client directly using their name, "you", and "your". Refer to yourself as "I" or "Vittaparāmarśadātā". Do NOT say the data belongs to Vittaparāmarśadātā.

          DATA SUMMARY:
          - Net Cash Flow: $${parseFloat(report.net || 0).toFixed(2)} (Savings Rate: ${report.savingsRate || 0}%)
          - Total Income: $${parseFloat(report.income || 0).toFixed(2)}
          - Total Expenses: $${parseFloat(report.expense || 0).toFixed(2)}
          - Expense Growth vs Last Month: ${report.expenseGrowth || 0}%

          CATEGORY CHANGES (VS LAST MONTH):
          ${report.catComparison && report.catComparison.length > 0 ? report.catComparison.slice(0,4).map(c => `- ${c.category}: You spent $${c.current} (Difference: ${c.diff > 0 ? '+' : ''}$${c.diff} / ${c.pct}% change)`).join('\n') : 'No comparison data.'}

          INVESTMENT PERFORMANCE:
          ${report.investments && report.investments.length > 0 ? report.investments.map(i => `- ${i.name}: Closing Balance $${i.balance}, New Contribution $${i.contrib}, Gain/Loss $${parseFloat(i.gainLoss || 0).toFixed(2)}`).join('\n') : 'No active investments.'}

          Please provide your response in 3 brief sections:
          1. Executive Summary (2 sentences max).
          2. Specific Observations (2-3 bullet points calling out specific numbers from the category changes or investments).
          3. Actionable Recommendation (1 bullet point).
        `;

        const aiResult = await generateText({ model: ollama('vault-coder'), prompt: promptBrief, system: "You are Vittaparāmarśadātā, a professional financial advisor. Speak directly to the client. Do not output raw JSON." });
        const finalInsight = aiResult.text;
        await pool.query('INSERT INTO ai_monthly_insights (month, insights) VALUES ($1, $2)', [targetMonth, finalInsight]);
        await notifyAdmin(`✅ *Manual AI Analysis Complete*\n\nVittaparāmarśadātā has successfully analyzed the report for ${targetMonth}.`, true);
        res.json({ success: true, insights: finalInsight });
    } catch (error) { res.status(500).json({error: "Failed to generate AI insights."}); }
});

cron.schedule('0 10 1 * *', async () => {
  try {
    const reports = await generateMonthlyReportData();
    const date = new Date(); date.setMonth(date.getMonth() - 1); 
    const lastMonthStr = date.toISOString().slice(0, 7);
    const report = reports.find(r => r.month === lastMonthStr);
    
    if (report) {
      const existing = await pool.query('SELECT insights FROM ai_monthly_insights WHERE month = $1', [lastMonthStr]);
      if (existing.rows.length === 0) {
        const userRes = await pool.query('SELECT username FROM users ORDER BY id ASC LIMIT 1');
        const clientName = userRes.rows.length > 0 ? userRes.rows[0].username : 'Valued Client';

        const promptBrief = `
          You are Vittaparāmarśadātā, an elite AI financial advisor built into the Dhanapālana platform.
          Analyze the finalized financial data for ${lastMonthStr}.
          
          CRITICAL RULE: The client's name is ${clientName}. Address the client directly using their name, "you", and "your". Refer to yourself as "I" or "Vittaparāmarśadātā". Do NOT say the data belongs to Vittaparāmarśadātā.

          DATA SUMMARY:
          - Net Cash Flow: $${parseFloat(report.net || 0).toFixed(2)} (Savings Rate: ${report.savingsRate || 0}%)
          - Total Income: $${parseFloat(report.income || 0).toFixed(2)}
          - Total Expenses: $${parseFloat(report.expense || 0).toFixed(2)}
          - Expense Growth vs Last Month: ${report.expenseGrowth || 0}%

          CATEGORY CHANGES (VS LAST MONTH):
          ${report.catComparison && report.catComparison.length > 0 ? report.catComparison.slice(0,4).map(c => `- ${c.category}: You spent $${c.current} (Difference: ${c.diff > 0 ? '+' : ''}$${c.diff} / ${c.pct}% change)`).join('\n') : 'No comparison data.'}

          Please provide your response in 3 brief sections:
          1. Executive Summary (2 sentences max).
          2. Specific Observations.
          3. Actionable Recommendation.
        `;

        const aiResult = await generateText({ model: ollama('vault-coder'), prompt: promptBrief, system: "You are Vittaparāmarśadātā, a professional financial advisor. Speak directly to the client." });
        await pool.query('INSERT INTO ai_monthly_insights (month, insights) VALUES ($1, $2)', [lastMonthStr, aiResult.text]);
      }

      const topCategories = report.catComparison.slice(0, 3).map(c => `  - ${c.category}: C$${c.current.toFixed(0)}`).join('\n');
      const isPositive = report.net >= 0;
      const text = `📊 *Vault Monthly Report: ${lastMonthStr}*\n\n💰 *Total Inflow:* C$${report.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n📉 *Total Expenses:* C$${report.expense.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n${isPositive ? '🟢' : '🔴'} *Net Flow:* C$${report.net.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n🎯 *Savings Rate:* ${report.savingsRate}%\n\n_Top 3 Expenses:_\n${topCategories}\n\n🤖 *Vittaparāmarśadātā has analyzed your month.* Log in to view or download your official PDF report!`;
      await sendTelegramMessage(text);
    }
  } catch (err) {}
});

cron.schedule('0 2 * * *', async () => {
  try {
    logger.info('Initiating Nightly AI Sweep for missing historical reports...');
    await runHistoricalBackfill();
  } catch (e) {}
});

// ==========================================
// DASHBOARD & TELEGRAM AI
// ==========================================

app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const catResult = await pool.query(`SELECT c.name as category, SUM(e.amount) as total FROM expenses e JOIN categories c ON e.category_id = c.id WHERE e.status != 'DELETED' GROUP BY c.name`);
    const incomeResult = await pool.query(`SELECT SUM(amount) as total FROM income WHERE status != 'DELETED'`);
    const expenseResult = await pool.query(`SELECT SUM(amount) as total FROM expenses WHERE status != 'DELETED'`);
    const monthlyIncome = await pool.query(`SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(amount) as total FROM income WHERE status != 'DELETED' GROUP BY month ORDER BY month DESC`);
    const monthlyExpenses = await pool.query(`SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(amount) as total FROM expenses WHERE status != 'DELETED' GROUP BY month ORDER BY month DESC`);
    const savingsResult = await pool.query(`SELECT b.name as bank_name, act.name as account_type, s.balance FROM savings_accounts s JOIN banks b ON s.bank_id = b.id LEFT JOIN account_types act ON s.account_type_id = act.id`);
    const creditResult = await pool.query(`SELECT SUM(balance) as total, SUM(limit_amount) as total_limit FROM credit_cards`);
    const creditDataResult = await pool.query(`SELECT name, balance FROM credit_cards ORDER BY balance DESC`);
    const lendingResult = await pool.query(`SELECT SUM(COALESCE(amount, 0) - COALESCE(repaid, 0)) as total FROM lending WHERE status != 'DELETED'`);
    const invResult = await pool.query(`SELECT i.id, COALESCE((SELECT balance FROM investment_logs il WHERE il.investment_id = i.id AND il.status != 'DELETED' ORDER BY date DESC, id DESC LIMIT 1), 0) as latest_balance FROM investments i WHERE i.status != 'DELETED'`);
    const transferResult = await pool.query(`SELECT SUM(amount) as total, SUM(inr_amount) as total_inr FROM transfers WHERE status != 'DELETED'`);

    const totalInvestments = invResult.rows.reduce((sum, row) => sum + parseFloat(row.latest_balance), 0);
    const totalSavings = savingsResult.rows.reduce((sum, row) => sum + parseFloat(row.balance), 0);
    const totalOwedToYou = lendingResult.rows.length > 0 && lendingResult.rows[0].total ? parseFloat(lendingResult.rows[0].total) : 0;
    const totalTransfers = parseFloat(transferResult.rows[0]?.total || 0);
    const totalTransfersINR = parseFloat(transferResult.rows[0]?.total_inr || 0);
    const totalCreditDebt = parseFloat(creditResult.rows[0]?.total || 0);
    const totalCreditLimit = parseFloat(creditResult.rows[0]?.total_limit || 0); 
    const netWorth = (totalSavings + totalOwedToYou + totalInvestments) - totalCreditDebt;

    const recentIncome = await pool.query(`SELECT 'Income' as type, source as description, amount, date FROM income WHERE status != 'DELETED' ORDER BY date DESC LIMIT 5`);
    const recentExpenses = await pool.query(`SELECT 'Expense' as type, COALESCE(NULLIF(e.description, ''), c.name) as description, e.amount, e.date FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.status != 'DELETED' ORDER BY e.date DESC LIMIT 5`);
    const recentTransfers = await pool.query(`SELECT 'Transfer' as type, CONCAT('To ', recipient) as description, amount, date FROM transfers WHERE status != 'DELETED' ORDER BY date DESC LIMIT 5`);
    const recentLending = await pool.query(`SELECT 'Lending' as type, CONCAT('Loan to ', recipient) as description, amount, date FROM lending WHERE status != 'DELETED' ORDER BY date DESC LIMIT 5`);

    res.json({
      netWorth, totalInvestments, totalIncome: parseFloat(incomeResult.rows[0]?.total || 0), totalExpenses: parseFloat(expenseResult.rows[0]?.total || 0),
      totalTransfers, totalTransfersINR, totalOwedToYou, 
      monthlyIncome: monthlyIncome.rows, monthlyExpenses: monthlyExpenses.rows, 
      totalCreditDebt, creditUtilization: totalCreditLimit > 0 ? (totalCreditDebt / totalCreditLimit) * 100 : 0,
      categoryData: catResult.rows.map(row => ({ name: row.category, value: parseFloat(row.total) })),
      bankData: savingsResult.rows.map(row => ({ name: row.bank_name + (row.account_type ? ` (${row.account_type})` : ''), balance: parseFloat(row.balance) })),
      creditData: creditDataResult.rows.map(row => ({ name: row.name, balance: -parseFloat(row.balance) })),
      recentIncome: recentIncome.rows, recentExpenses: recentExpenses.rows, recentTransfers: recentTransfers.rows, recentLending: recentLending.rows
    });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ==========================================
// AI QUERY DESIGNER — CRUD + GENERATE + TEST
// ==========================================

// List all examples
app.get('/api/ai-examples', isAdmin, async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM ai_query_examples ORDER BY id')).rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Create new example
app.post('/api/ai-examples', isAdmin, async (req, res) => {
  const { question, sql_query, description } = req.body;
  if (!question || !sql_query) return res.status(400).json({ error: 'question and sql_query are required.' });
  try {
    const r = await pool.query('INSERT INTO ai_query_examples (question, sql_query, description) VALUES ($1, $2, $3) RETURNING *', [question.trim(), sql_query.trim(), (description || '').trim()]);
    await logAction(`AI Query Example added: "${question.trim().substring(0, 60)}"`);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update existing example
app.put('/api/ai-examples/:id', isAdmin, async (req, res) => {
  const { question, sql_query, description } = req.body;
  if (!question || !sql_query) return res.status(400).json({ error: 'question and sql_query are required.' });
  try {
    const r = await pool.query('UPDATE ai_query_examples SET question=$1, sql_query=$2, description=$3, updated_at=NOW() WHERE id=$4 RETURNING *', [question.trim(), sql_query.trim(), (description || '').trim(), req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Example not found.' });
    await logAction(`AI Query Example updated: ID ${req.params.id}`);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete example
app.delete('/api/ai-examples/:id', isAdmin, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM ai_query_examples WHERE id=$1 RETURNING question', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Example not found.' });
    await logAction(`AI Query Example deleted: ID ${req.params.id} ("${r.rows[0].question.substring(0, 60)}")`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Generate SQL from a plain-English question using the AI model
app.post('/api/ai-examples/generate', isAdmin, async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'question is required.' });
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    const lastToLastStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
    const lastToLastEnd   = new Date(now.getFullYear(), now.getMonth() - 1, 0).toISOString().split('T')[0];

    let validCategories = '';
    try { const c = await pool.query('SELECT name FROM categories'); validCategories = c.rows.map(r => r.name).join(', '); } catch(_) {}

    const schemaCtx = `categories(id,name), banks(id,name), savings_accounts(id,bank_id,account_type_id,currency,balance), income(id,source,amount,account_id,date), expenses(id,amount,category_id,account_id,credit_card_id,date,description), transfers(id,source_account_id,recipient,recipient_bank_id,amount,exchange_rate,inr_amount,method,date), lending(id,source_account_id,recipient,recipient_bank_id,amount,method,repaid,date). Valid category names: ${validCategories}.`;
    const genPrompt = `You are a PostgreSQL expert. Convert the question into a single valid SQL SELECT and output ONLY the raw SQL, no fences, no semicolons.\nSchema: ${schemaCtx}\nDate context — today: ${today}, this month: ${thisMonthStart} to ${today}, last month: ${lastMonthStart} to ${lastMonthEnd}, last-to-last month: ${lastToLastStart} to ${lastToLastEnd}.\nRules: use COALESCE(SUM,0) for totals; use ORDER BY amount DESC LIMIT N for biggest/top queries; resolve category names via subquery with ILIKE; use INTERVAL for rolling periods.`;

    const extractSql = (text) => {
      if (!text) return '';
      const cleaned = String(text).replace(/```sql|```/gi, ' ').trim();
      const selectMatch = cleaned.match(/select[\s\S]*/i);
      return (selectMatch ? selectMatch[0] : cleaned).replace(/;\s*$/, '').trim();
    };

    let sql = '';
    const firstTry = await generateText({ model: ollama('vault-coder'), system: genPrompt, prompt: question });
    sql = extractSql(firstTry.text);

    // Fallback: use a single, few-shot prompt block when the first call returns empty.
    if (!sql) {
      const exRows = (await pool.query('SELECT question, sql_query FROM ai_query_examples ORDER BY id LIMIT 12')).rows;
      const examples = exRows.map(e => `Q: ${e.question}\nSQL: ${e.sql_query}`).join('\n\n');
      const fallbackPrompt = `Generate ONE PostgreSQL SELECT query for the question below.\nReturn only SQL (no markdown, no commentary).\n\nSchema: ${schemaCtx}\nDate values: TODAY=${today}, THIS_MONTH_START=${thisMonthStart}, LAST_MONTH_START=${lastMonthStart}, LAST_MONTH_END=${lastMonthEnd}, LAST_TO_LAST_START=${lastToLastStart}, LAST_TO_LAST_END=${lastToLastEnd}.\n\nExamples:\n${examples}\n\nQuestion: ${question}`;
      const secondTry = await generateText({ model: ollama('vault-coder'), prompt: fallbackPrompt });
      sql = extractSql(secondTry.text);
    }

    if (!sql) return res.status(500).json({ error: 'AI returned an empty response. Try rephrasing the question, or write the SQL manually.' });

    // Convert concrete dates back to placeholders so the example stays valid every month
    sql = sql.replace(new RegExp(thisMonthStart, 'g'), '{THIS_MONTH_START}')
             .replace(new RegExp(today, 'g'), '{TODAY}')
             .replace(new RegExp(lastMonthStart, 'g'), '{LAST_MONTH_START}')
             .replace(new RegExp(lastMonthEnd, 'g'), '{LAST_MONTH_END}')
             .replace(new RegExp(lastToLastStart, 'g'), '{LAST_TO_LAST_START}')
             .replace(new RegExp(lastToLastEnd, 'g'), '{LAST_TO_LAST_END}');
    res.json({ sql });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Test a SQL query against the live DB (SELECT only — safety enforced)
app.post('/api/ai-examples/test', isAdmin, async (req, res) => {
  let { sql } = req.body;
  if (!sql) return res.status(400).json({ error: 'sql is required.' });

  // Replace date placeholders with today's actual values before running
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  const lastToLastStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
  const lastToLastEnd   = new Date(now.getFullYear(), now.getMonth() - 1, 0).toISOString().split('T')[0];
  sql = sql.replace(/{TODAY}/g, today).replace(/{THIS_MONTH_START}/g, thisMonthStart)
           .replace(/{LAST_MONTH_START}/g, lastMonthStart).replace(/{LAST_MONTH_END}/g, lastMonthEnd)
           .replace(/{LAST_TO_LAST_START}/g, lastToLastStart).replace(/{LAST_TO_LAST_END}/g, lastToLastEnd);

  // Only allow SELECT statements — refuse anything that could modify data
  const normalizedSql = sql.trim().toUpperCase();
  if (!/^\s*SELECT\b/i.test(normalizedSql) || /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|GRANT|REVOKE|EXEC|EXECUTE)\b/i.test(normalizedSql)) {
    return res.status(400).json({ error: 'Only SELECT queries are allowed in the test runner.' });
  }
  try {
    const result = await pool.query(sql + ' LIMIT 20');
    res.json({ rows: result.rows, rowCount: result.rowCount });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DB schema browser — returns tables + columns for the SQL editor helper panel
app.get('/api/ai-schema', isAdmin, async (req, res) => {
  try {
    const r = await pool.query(`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('categories','banks','savings_accounts','income','expenses','transfers','lending','credit_cards','recipient_banks','account_types') ORDER BY table_name, ordinal_position`);
    const schema = {};
    r.rows.forEach(row => {
      if (!schema[row.table_name]) schema[row.table_name] = [];
      schema[row.table_name].push({ column: row.column_name, type: row.data_type });
    });
    res.json(schema);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/telegram/webhook', async (req, res) => {
  const message = req.body.message;
  if (!message || !message.text) return res.sendStatus(200);

  let authorizedChatId = process.env.TELEGRAM_CHAT_ID;
  try {
    const settings = await pool.query("SELECT value FROM system_settings WHERE key = 'TELEGRAM_CHAT_ID'");
    if (settings.rows.length > 0) authorizedChatId = settings.rows[0].value;
  } catch(e) {}

  if (message.chat.id.toString() !== authorizedChatId.toString()) return res.sendStatus(200); 

  const userQuery = message.text;
  const chatId = message.chat.id.toString();

  // Allow the user to clear conversation history with /reset
  if (userQuery.trim().toLowerCase() === '/reset') {
    conversationHistories.delete(chatId);
    res.status(200).send('OK');
    await sendTelegramMessage("Conversation history cleared. Starting fresh! 🔄");
    return;
  }

  res.status(200).send('OK');
  const chatHistoryEntry = getConversationHistory(chatId);
  console.log(`\n🔔 [TELEGRAM] Received message: "${userQuery}"`);

  try {
    let token = process.env.TELEGRAM_BOT_TOKEN;
    const settings = await pool.query("SELECT value FROM system_settings WHERE key = 'TELEGRAM_BOT_TOKEN'");
    if (settings.rows.length > 0) token = settings.rows[0].value;
    await axios.post(`https://api.telegram.org/bot${token}/sendChatAction`, { chat_id: authorizedChatId, action: 'typing' });
  } catch (err) {}

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    const lastToLastMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
    const lastToLastMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0).toISOString().split('T')[0];

    let validCategories = "Unknown";
    try {
      const catRes = await pool.query('SELECT name FROM categories');
      validCategories = catRes.rows.map(r => `'${r.name}'`).join(', ');
    } catch(e) {}

    const schemaString = `
      - categories (id, name)  [VALID NAMES: ${validCategories}]
      - banks (id, name)
      - savings_accounts (id, bank_id, account_type_id, currency, balance)
      - income (id, source, amount, account_id, date)
      - expenses (id, amount, category_id, account_id, credit_card_id, date, description)
      - transfers (id, source_account_id, recipient, recipient_bank_id, amount, exchange_rate, inr_amount, method, date)
      - lending (id, source_account_id, recipient, recipient_bank_id, amount, method, repaid, date)
    `;

    const normalizedUserQuery = (userQuery || '').toLowerCase();

    // ── AI Pass 1: generate SQL from natural language ──────────────────────────
    console.log("🤖 [AI Pass 1] Generating SQL...");

    // Load few-shot examples from DB (managed via Admin → AI Query Designer).
    // SQL values stored with date placeholders; replace them with today's computed values.
    const replaceDatePlaceholders = (sql) => sql
      .replace(/{TODAY}/g, today)
      .replace(/{THIS_MONTH_START}/g, thisMonthStart)
      .replace(/{LAST_MONTH_START}/g, lastMonthStart)
      .replace(/{LAST_MONTH_END}/g, lastMonthEnd)
      .replace(/{LAST_TO_LAST_START}/g, lastToLastMonthStart)
      .replace(/{LAST_TO_LAST_END}/g, lastToLastMonthEnd);

    let examplesSection = '';
    try {
      const exRows = (await pool.query('SELECT question, sql_query FROM ai_query_examples ORDER BY id')).rows;
      if (exRows.length > 0) {
        examplesSection = '\n\nEXAMPLES:\n\n' + exRows.map(e => `Q: ${e.question}\nSQL: ${replaceDatePlaceholders(e.sql_query)}`).join('\n\n');
      }
    } catch (_) { /* examples unavailable — model works on rules alone */ }

    const sqlPrompt = `You are a PostgreSQL expert embedded in a personal finance app. Your ONLY job is to convert the user's question into a single valid SQL SELECT statement.

DATABASE SCHEMA:
${schemaString}

DATE CONTEXT (use these exact values — do not calculate):
- Today: ${today}
- This month: ${thisMonthStart} to ${today}
- Last month: ${lastMonthStart} to ${lastMonthEnd}
- Last to last month / two months ago: ${lastToLastMonthStart} to ${lastToLastMonthEnd}

OUTPUT RULES:
1. Output ONLY the raw SQL query. No explanations, no markdown, no code fences, no semicolons.
2. Always use COALESCE(SUM(amount), 0) for totals so zero is returned instead of NULL.
3. Foreign key columns (category_id, account_id, bank_id) are integers — always resolve category/bank names via subquery with ILIKE '%...%'.
4. For "biggest", "largest", "highest", "top N" queries use ORDER BY amount DESC LIMIT N — never use SUM for these.
5. For rolling periods ("last X months", "past X days", "last year") use PostgreSQL INTERVAL syntax.
6. If the question is vague about time, default to this month.${examplesSection}`;

    // Pass recent exchanges so model can resolve follow-up questions like "what about last month?"
    const recentContext = chatHistoryEntry.messages.slice(-6);
    const sqlResult = await generateText({
      model: ollama('vault-coder'),
      system: sqlPrompt,
      messages: [
        ...recentContext,
        { role: 'user', content: userQuery }
      ]
    });

    let generatedText = sqlResult.text;
    console.log(`🤖 [AI Pass 1] Raw output: "${generatedText.substring(0, 300)}"`);

    const extractSqlCandidate = (text) => {
      const fenced = text.match(/```sql\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
      const candidate = fenced ? fenced[1].trim() : text.trim();
      return candidate.replace(/;\s*$/, '');
    };

    let sqlQuery = extractSqlCandidate(generatedText);

    // Repair pass: if model returned prose instead of SQL, ask it to self-correct
    if (!/\bSELECT\b/i.test(sqlQuery)) {
      console.log("⚠️ [AI Pass 1] No SELECT found, attempting repair...");
      const repairResult = await generateText({
        model: ollama('vault-coder'),
        system: `You are a PostgreSQL query rewriter. Return exactly ONE valid SELECT statement and nothing else. No markdown, no explanations, no semicolons. Use only these tables: categories, savings_accounts, income, expenses, transfers, lending. Resolve category/bank names via subquery with ILIKE.`,
        messages: [{ role: 'user', content: `Question: ${userQuery}\n\nBad output to fix:\n${generatedText}\n\nReturn only the SQL SELECT:` }]
      });
      sqlQuery = extractSqlCandidate(repairResult.text);
      console.log(`⚠️ [AI Repair] Output: "${sqlQuery.substring(0, 300)}"`);
    }

    if (!/\bSELECT\b/i.test(sqlQuery)) {
      const useLastMonth = /(last\s*month|last\s*months)/i.test(normalizedUserQuery);
      const rangeStart = useLastMonth ? lastMonthStart : thisMonthStart;
      const rangeEnd = useLastMonth ? lastMonthEnd : today;
      sqlQuery = `SELECT COALESCE(SUM(amount), 0) AS total_expense
FROM expenses
WHERE date >= '${rangeStart}'
AND date <= '${rangeEnd}'`;
    }

    console.log(`💾 [DB] Executing Query: ${sqlQuery.replace(/\n/g, ' ')}`);
    let dbData = [];
    try { 
      const result = await pool.query(sqlQuery);
      dbData = result.rows;
    } catch (dbErr) {
      console.error(`❌ [DB ERROR]: ${dbErr.message}`);
      await sendTelegramMessage(`My database encountered an error understanding that request: ${dbErr.message}`);
      return;
    }

    // Build a natural language response directly from the DB data.
    // vault-coder is SQL-tuned and returns empty for prose synthesis, so we format directly.
    const fmtAmount = (v) => {
      const n = parseFloat(v);
      return isNaN(n) ? String(v) : `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    const fmtDate = (v) => {
      try { return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (_) { return String(v); }
    };
    const q = normalizedUserQuery;

    let finalMessage = '';
    if (!dbData || dbData.length === 0) {
      finalMessage = "Good news! I checked your records and found no matching entries for that period. 🎉";
    } else if (dbData.length > 1) {
      // Multi-row list
      const lines = dbData.map((r, i) => {
        const parts = Object.entries(r).map(([k, v]) => {
          if (/amount|total|sum/i.test(k)) return fmtAmount(v);
          if (/date/i.test(k)) return fmtDate(v);
          return String(v || '');
        });
        return `${i + 1}. ${parts.filter(Boolean).join(' | ')}`;
      });
      finalMessage = `Here's what I found for you 📊:\n\n${lines.join('\n')}`;
    } else {
      const row = dbData[0];
      const keys = Object.keys(row);
      // Income + expense summary (two column pattern)
      const incomeKey = keys.find(k => /income/i.test(k));
      const expenseKey = keys.find(k => /expense/i.test(k));
      if (incomeKey && expenseKey) {
        const income = parseFloat(row[incomeKey]) || 0;
        const expense = parseFloat(row[expenseKey]) || 0;
        const net = income - expense;
        const netStr = net >= 0 ? `a surplus of ${fmtAmount(net)} 📈` : `a deficit of ${fmtAmount(Math.abs(net))} 📉`;
        finalMessage = `Here's your financial summary 📊:\n\n💰 Total Income: ${fmtAmount(income)}\n💸 Total Expenses: ${fmtAmount(expense)}\n📊 Net: ${netStr}`;
      // Biggest/top expense with description/date/category
      } else if (/biggest|largest|highest|top|maximum/i.test(q) && keys.length > 1) {
        const amount = row[keys.find(k => /amount/i.test(k))];
        const desc = row[keys.find(k => /desc/i.test(k))] || null;
        const category = row[keys.find(k => /cat/i.test(k))] || null;
        const date = row[keys.find(k => /date/i.test(k))] || null;
        let msg = `Your biggest expense was ${fmtAmount(amount)} 💸`;
        if (desc) msg += ` for "${desc}"`;
        if (category) msg += ` (${category})`;
        if (date) msg += ` on ${fmtDate(date)}`;
        finalMessage = msg + '.';
      // Single aggregate column
      } else if (keys.length === 1) {
        const val = parseFloat(row[keys[0]]) || 0;
        const key = keys[0].toLowerCase();
        if (val === 0) {
          finalMessage = /income/i.test(key) || /income/i.test(q)
            ? 'I checked your records and found no income entries for that period. 📊'
            : 'Good news! I checked your records and found no expenses for that period. 🎉';
        } else if (/income/i.test(key)) {
          finalMessage = `Your total income for that period was ${fmtAmount(val)}. 💰`;
        } else {
          const label = /grocery|groceries/i.test(q) ? 'grocery expenses' : 'expenses';
          finalMessage = `I checked your records, and your total ${label} came to ${fmtAmount(val)}. 💸`;
        }
      // Generic single row with multiple columns
      } else {
        const parts = keys.map(k => {
          const v = row[k];
          if (/amount|total|sum|balance/i.test(k)) return `${k.replace(/_/g,' ')}: ${fmtAmount(v)}`;
          if (/date/i.test(k)) return `${k.replace(/_/g,' ')}: ${fmtDate(v)}`;
          return `${k.replace(/_/g,' ')}: ${v}`;
        });
        finalMessage = `Here are the details I found 📊:\n${parts.join('\n')}`;
      }
    }
    console.log(`📨 [RESPONSE] ${finalMessage.substring(0, 120)}`);

    // Persist this exchange so future messages have context
    appendToConversation(chatId, userQuery, finalMessage);

    try { await sendTelegramMessage(finalMessage); } catch (telegramErr) {}
    return; 

  } catch (error) {
    console.error("❌ [AI ERROR]:", error);
    await sendTelegramMessage(`🚨 System Alert: AI Engine encountered an error.`);
    return; 
  }
});

const PORT = 5000;
app.listen(PORT, async () => { 
  logger.info(`Security Core Online on port ${PORT}`); 
  try {
    const settings = await pool.query("SELECT key, value FROM system_settings WHERE key IN ('NGROK_TOKEN', 'TELEGRAM_BOT_TOKEN')");
    const map = {}; settings.rows.forEach(r => map[r.key] = r.value);
    if (map['NGROK_TOKEN']) {
      await initializeTunnel(map['NGROK_TOKEN'], map['TELEGRAM_BOT_TOKEN']);
    }
    setTimeout(runHistoricalBackfill, 5000);
  } catch(e) {}
});