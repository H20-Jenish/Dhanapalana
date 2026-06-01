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

let JWT_SECRET = process.env.JWT_SECRET || ''; 

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

const initializeTunnel = async () => null;

const runMigrations = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, mfa_secret TEXT, mfa_enabled BOOLEAN DEFAULT FALSE, reset_otp TEXT, reset_otp_expires TIMESTAMP);
        CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name TEXT NOT NULL, sort_order INTEGER);
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
        CREATE TABLE IF NOT EXISTS investment_reminder_settings (id SERIAL PRIMARY KEY, investment_id INTEGER UNIQUE REFERENCES investments(id) ON DELETE CASCADE, is_enabled BOOLEAN DEFAULT FALSE, frequency_days INTEGER DEFAULT 30, last_sent_on DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, message TEXT NOT NULL, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, action_details TEXT NOT NULL, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE IF NOT EXISTS password_history (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, password_hash TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS system_backups (id SERIAL PRIMARY KEY, version TEXT UNIQUE NOT NULL, filename TEXT NOT NULL, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      `);
      
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp TEXT;`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expires TIMESTAMP;`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
      await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER;`);
      await pool.query(`ALTER TABLE investments ADD COLUMN IF NOT EXISTS account_type_id INTEGER REFERENCES account_types(id);`);
      await pool.query(`ALTER TABLE investment_reminder_settings ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT FALSE;`);
      await pool.query(`ALTER TABLE investment_reminder_settings ADD COLUMN IF NOT EXISTS frequency_days INTEGER DEFAULT 30;`);
      await pool.query(`ALTER TABLE investment_reminder_settings ADD COLUMN IF NOT EXISTS last_sent_on DATE;`);
      await pool.query(`ALTER TABLE investment_reminder_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
      await pool.query(`UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users)`);
      
      const catCount = await pool.query('SELECT COUNT(*) FROM categories');
      if (parseInt(catCount.rows[0].count) === 0) {
        await pool.query(`INSERT INTO categories (name) VALUES ('Rent'), ('Utility'), ('Installment'), ('Insurance'), ('Mobile Bill'), ('Gas'), ('Grocery'), ('Food'), ('Shopping'), ('Charging'), ('Personal Care'), ('Household'), ('Misc')`);
      }
      await pool.query(`UPDATE categories SET sort_order = COALESCE(sort_order, id)`);
      const accCount = await pool.query('SELECT COUNT(*) FROM account_types');
      if (parseInt(accCount.rows[0].count) === 0) { 
        await pool.query(`INSERT INTO account_types (name) VALUES ('Savings'), ('Checking'), ('Investment')`); 
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
  try {
    const rows = (await pool.query("SELECT key, value FROM system_settings WHERE key IN ('TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID')")).rows;
    const config = rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    if (!config.TELEGRAM_BOT_TOKEN || !config.TELEGRAM_CHAT_ID) return false;

    await axios.post(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: config.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
    });
    return true;
  } catch (err) {
    return false;
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
    const targetNames = ['vault_frontend', 'vault_backend', 'vault_db', 'vault_nginx'];
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

app.get('/api/categories', async (req, res) => { try { res.json((await pool.query('SELECT * FROM categories ORDER BY COALESCE(sort_order, id), name, id')).rows); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/categories', isAdmin, async (req, res) => {
  try {
    const nextSort = (await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort FROM categories')).rows[0].next_sort;
    const result = await pool.query('INSERT INTO categories (name, sort_order) VALUES ($1, $2) RETURNING *', [req.body.name, nextSort]);
    await logAction(`System config added: [categories] ${req.body.name}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/categories/:id', isAdmin, async (req, res) => {
  try {
    const result = await pool.query('UPDATE categories SET name = $1 WHERE id = $2 RETURNING *', [req.body.name, req.params.id]);
    await logAction(`System config modified: [categories] ID ${req.params.id} changed to ${req.body.name}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/categories/:id', isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    await logAction(`System config deleted: [categories] ID ${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'In use.' });
  }
});
app.post('/api/categories/:id/move', isAdmin, async (req, res) => {
  const direction = req.body.direction;
  if (!['up', 'down'].includes(direction)) return res.status(400).json({ error: 'Invalid move direction.' });
  try {
    await pool.query('BEGIN');
    const currentResult = await pool.query('SELECT id, sort_order FROM categories WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (currentResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Category not found.' });
    }

    const current = currentResult.rows[0];
    const swapQuery = direction === 'up'
      ? 'SELECT id, sort_order FROM categories WHERE COALESCE(sort_order, id) < COALESCE($1, $2) ORDER BY COALESCE(sort_order, id) DESC, id DESC LIMIT 1 FOR UPDATE'
      : 'SELECT id, sort_order FROM categories WHERE COALESCE(sort_order, id) > COALESCE($1, $2) ORDER BY COALESCE(sort_order, id) ASC, id ASC LIMIT 1 FOR UPDATE';
    const adjacentResult = await pool.query(swapQuery, [current.sort_order, current.id]);
    if (adjacentResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.json({ success: true, moved: false });
    }

    const adjacent = adjacentResult.rows[0];
    await pool.query('UPDATE categories SET sort_order = $1 WHERE id = $2', [adjacent.sort_order ?? adjacent.id, current.id]);
    await pool.query('UPDATE categories SET sort_order = $1 WHERE id = $2', [current.sort_order ?? current.id, adjacent.id]);
    await pool.query('COMMIT');
    res.json({ success: true, moved: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories/reorder', isAdmin, async (req, res) => {
  const { categoryIds } = req.body;
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    return res.status(400).json({ error: 'Invalid category order.' });
  }

  try {
    await pool.query('BEGIN');
    for (let i = 0; i < categoryIds.length; i += 1) {
      await pool.query('UPDATE categories SET sort_order = $1 WHERE id = $2', [i + 1, categoryIds[i]]);
    }
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

createAdminRoutes('banks', 'banks'); 

app.get('/api/banks', async (req, res) => { try { res.json((await pool.query('SELECT * FROM banks ORDER BY name')).rows); } catch (err) { res.status(500).json({ error: err.message }); } });
createAdminRoutes('recipient-banks', 'recipient_banks'); 

app.get('/api/recipient-banks', async (req, res) => { try { res.json((await pool.query('SELECT * FROM recipient_banks ORDER BY name')).rows); } catch (err) { res.status(500).json({ error: err.message }); } });
createAdminRoutes('account-types', 'account_types');

app.get('/api/account-types', async (req, res) => { try { res.json((await pool.query('SELECT * FROM account_types ORDER BY name')).rows); } catch (err) { res.status(500).json({ error: err.message }); } });

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

app.get('/api/investments', async (req, res) => { try { res.json((await pool.query(`SELECT i.id, i.name, i.type, i.bank_id, i.account_type_id, b.name as bank_name, act.name as account_type_name, COALESCE((SELECT balance FROM investment_logs il WHERE il.investment_id = i.id AND il.status != 'DELETED' ORDER BY date DESC, id DESC LIMIT 1), 0) as current_balance, COALESCE((SELECT SUM(net_contribution) FROM investment_logs il WHERE il.investment_id = i.id AND il.status != 'DELETED'), 0) as total_contributed, (SELECT date FROM investment_logs il WHERE il.investment_id = i.id AND il.status != 'DELETED' ORDER BY date DESC, id DESC LIMIT 1) as last_log_date FROM investments i LEFT JOIN banks b ON i.bank_id = b.id LEFT JOIN account_types act ON i.account_type_id = act.id WHERE i.status != 'DELETED' ORDER BY i.id DESC`)).rows); } catch (err) { res.status(500).json({ error: err.message }); } });
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
app.get('/api/investments/:id/logs', async (req, res) => {
  try {
    const logs = await pool.query(
      `SELECT il.id, il.investment_id, il.date, il.balance, il.net_contribution, il.status, i.name as investment_name, i.type as investment_type
       FROM investment_logs il
       JOIN investments i ON il.investment_id = i.id
       WHERE il.investment_id = $1 AND il.status != 'DELETED' AND i.status != 'DELETED'
       ORDER BY il.date DESC, il.id DESC
       LIMIT 120`,
      [req.params.id]
    );
    res.json(logs.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/investment-reminders', isAdmin, async (req, res) => {
  try {
    const query = await pool.query(`
      SELECT
        i.id AS investment_id,
        i.name,
        i.type,
        act.name AS account_type_name,
        COALESCE(rs.is_enabled, FALSE) AS is_enabled,
        COALESCE(rs.frequency_days, 30) AS frequency_days,
        rs.last_sent_on,
        (
          SELECT il.date
          FROM investment_logs il
          WHERE il.investment_id = i.id AND il.status != 'DELETED'
          ORDER BY il.date DESC, il.id DESC
          LIMIT 1
        ) AS last_log_date
      FROM investments i
      LEFT JOIN account_types act ON i.account_type_id = act.id
      LEFT JOIN investment_reminder_settings rs ON rs.investment_id = i.id
      WHERE i.status != 'DELETED'
      ORDER BY i.name ASC
    `);
    res.json(query.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/investment-reminders', isAdmin, async (req, res) => {
  const { settings } = req.body;
  if (!Array.isArray(settings)) return res.status(400).json({ error: 'Invalid settings payload.' });

  try {
    await pool.query('BEGIN');
    for (const row of settings) {
      const investmentId = Number(row.investment_id);
      const frequencyDays = Number(row.frequency_days);
      const isEnabled = Boolean(row.is_enabled);

      if (!Number.isInteger(investmentId) || investmentId <= 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid investment id in settings.' });
      }
      if (!Number.isInteger(frequencyDays) || frequencyDays < 1 || frequencyDays > 365) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Frequency must be between 1 and 365 days.' });
      }

      await pool.query(
        `INSERT INTO investment_reminder_settings (investment_id, is_enabled, frequency_days, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (investment_id)
         DO UPDATE SET
           is_enabled = EXCLUDED.is_enabled,
           frequency_days = EXCLUDED.frequency_days,
           updated_at = CURRENT_TIMESTAMP`,
        [investmentId, isEnabled, frequencyDays]
      );
    }
    await pool.query('COMMIT');
    await logAction(`Investment reminder rules updated for ${settings.length} assets`);
    res.json({ success: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

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

app.get('/api/system-settings/security', async (req, res) => {
  try {
    const settings = await pool.query("SELECT value FROM system_settings WHERE key = 'AUTO_LOGOUT_TIMEOUT_MINUTES'");
    const timeoutMinutes = settings.rows.length > 0 ? settings.rows[0].value : '15';
    res.json({ AUTO_LOGOUT_TIMEOUT_MINUTES: timeoutMinutes });
  } catch(e) { res.status(500).json({error: e.message}); }
});

app.post('/api/system-settings/security', isAdmin, async (req, res) => {
  const { autoLogoutTimeoutMinutes } = req.body;
  try {
    const normalized = autoLogoutTimeoutMinutes === '' || autoLogoutTimeoutMinutes === null || autoLogoutTimeoutMinutes === undefined
      ? '15'
      : String(autoLogoutTimeoutMinutes);
    const parsedTimeout = Number(normalized);

    if (!Number.isFinite(parsedTimeout) || parsedTimeout < 0 || parsedTimeout > 1440) {
      return res.status(400).json({ error: 'Timeout must be a number between 0 and 1440 minutes.' });
    }

    const value = String(Math.floor(parsedTimeout));
    await pool.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['AUTO_LOGOUT_TIMEOUT_MINUTES', value]);
    await logAction(`Auto logout timeout updated to ${value === '0' ? 'disabled' : `${value} minutes`}`);
    res.json({ success: true, AUTO_LOGOUT_TIMEOUT_MINUTES: value });
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

app.get('/api/system-settings/investment-reminders', isAdmin, async (req, res) => {
  try {
    const settings = await pool.query("SELECT key, value FROM system_settings WHERE key IN ('INVESTMENT_REMINDER_TIME', 'INVESTMENT_REMINDER_TIMEZONE')");
    const defaultTimezone = process.env.TZ || 'America/Toronto';
    const map = {
      INVESTMENT_REMINDER_TIME: '09:00',
      INVESTMENT_REMINDER_TIMEZONE: defaultTimezone,
    };
    settings.rows.forEach((r) => {
      map[r.key] = r.value;
    });
    res.json(map);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/system-settings/investment-reminders', isAdmin, async (req, res) => {
  const { reminderTime, reminderTimezone } = req.body;
  const normalizedTime = String(reminderTime || '').trim();
  const normalizedTimezone = String(reminderTimezone || '').trim();

  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(normalizedTime)) {
    return res.status(400).json({ error: 'Reminder time must be in HH:mm (24h) format.' });
  }

  try {
    // Validate IANA timezone.
    new Intl.DateTimeFormat('en-US', { timeZone: normalizedTimezone }).format(new Date());
  } catch (err) {
    return res.status(400).json({ error: 'Invalid timezone. Use a valid IANA timezone like America/Toronto.' });
  }

  try {
    await pool.query('BEGIN');
    await pool.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['INVESTMENT_REMINDER_TIME', normalizedTime]);
    await pool.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['INVESTMENT_REMINDER_TIMEZONE', normalizedTimezone]);
    await pool.query('COMMIT');
    await logAction(`Investment reminder schedule updated: ${normalizedTime} ${normalizedTimezone}`);
    res.json({ success: true, INVESTMENT_REMINDER_TIME: normalizedTime, INVESTMENT_REMINDER_TIMEZONE: normalizedTimezone });
  } catch (e) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  }
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

const getDateTimePartsInTimeZone = (timeZone, date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const pick = (type) => parts.find((p) => p.type === type)?.value || '00';
  return {
    date: `${pick('year')}-${pick('month')}-${pick('day')}`,
    time: `${pick('hour')}:${pick('minute')}`,
  };
};

const addDaysToDateString = (dateStr, days) => {
  const [year, month, day] = String(dateStr).split('-').map((v) => Number(v));
  if (!year || !month || !day) return dateStr;
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + Number(days || 0));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
};

const runInvestmentReminderSweep = async (timeZone) => {
  try {
    const rows = (await pool.query(`
      SELECT
        i.id,
        i.name,
        i.type,
        act.name AS account_type_name,
        rs.frequency_days,
        TO_CHAR(rs.last_sent_on, 'YYYY-MM-DD') AS last_sent_on,
        (
          SELECT TO_CHAR(il.date, 'YYYY-MM-DD')
          FROM investment_logs il
          WHERE il.investment_id = i.id AND il.status != 'DELETED'
          ORDER BY il.date DESC, il.id DESC
          LIMIT 1
        ) AS last_log_date
      FROM investment_reminder_settings rs
      JOIN investments i ON i.id = rs.investment_id
      LEFT JOIN account_types act ON i.account_type_id = act.id
      WHERE rs.is_enabled = TRUE AND i.status != 'DELETED'
    `)).rows;

    const { date: todayStr } = getDateTimePartsInTimeZone(timeZone);

    for (const row of rows) {
      const frequencyDays = Number(row.frequency_days || 30);
      if (!Number.isInteger(frequencyDays) || frequencyDays < 1) continue;

      const baseDate = row.last_log_date || todayStr;
      const dueStr = addDaysToDateString(baseDate, frequencyDays);
      const sentToday = row.last_sent_on && String(row.last_sent_on) === todayStr;

      if (todayStr >= dueStr && !sentToday) {
        const label = [row.account_type_name, row.type].filter(Boolean).join(' | ');
        const message = `⏰ *Investment Reminder*\n\nAsset: *${row.name}*${label ? `\nType: ${label}` : ''}\nCadence: every ${frequencyDays} day(s)\nLast logged: ${row.last_log_date || 'No value log yet'}\nDue since: ${dueStr}\nDispatch timezone: ${timeZone}\n\nPlease update the investment value in Vault.`;
        await sendTelegramMessage(message);
        await pool.query('UPDATE investment_reminder_settings SET last_sent_on = $2::date, updated_at = CURRENT_TIMESTAMP WHERE investment_id = $1', [row.id, todayStr]);
        await notifyAdmin(`Investment reminder sent for ${row.name}`, false);
      }
    }
  } catch (err) {}
};

cron.schedule('* * * * *', async () => {
  try {
    const defaultTimezone = process.env.TZ || 'America/Toronto';
    const settings = await pool.query("SELECT key, value FROM system_settings WHERE key IN ('INVESTMENT_REMINDER_TIME', 'INVESTMENT_REMINDER_TIMEZONE', 'INVESTMENT_REMINDER_LAST_RUN_DATE')");
    const map = {
      INVESTMENT_REMINDER_TIME: '09:00',
      INVESTMENT_REMINDER_TIMEZONE: defaultTimezone,
      INVESTMENT_REMINDER_LAST_RUN_DATE: '',
    };
    settings.rows.forEach((row) => {
      map[row.key] = row.value;
    });

    let timeZone = map.INVESTMENT_REMINDER_TIMEZONE;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    } catch (err) {
      timeZone = defaultTimezone;
    }

    const nowInTz = getDateTimePartsInTimeZone(timeZone);
    const dueTime = map.INVESTMENT_REMINDER_TIME || '09:00';
    const alreadyRanToday = map.INVESTMENT_REMINDER_LAST_RUN_DATE === nowInTz.date;

    if (nowInTz.time !== dueTime || alreadyRanToday) return;

    await runInvestmentReminderSweep(timeZone);
    await pool.query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['INVESTMENT_REMINDER_LAST_RUN_DATE', nowInTz.date]);
  } catch (err) {}
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
  const categoryOrderRows = (await pool.query('SELECT id, name, COALESCE(sort_order, id) AS sort_order FROM categories ORDER BY COALESCE(sort_order, id), name, id')).rows;
  const categoryOrderMap = new Map(categoryOrderRows.map((category, index) => [category.name, { order: Number(category.sort_order ?? category.id), index }]));

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

    const monthsMap = {};
    const getMonthData = (m) => { 
        if (!monthsMap[m]) monthsMap[m] = { 
            month: m, income: 0, expense: 0, categories: {}, accounts: {}, 
            topExpenses: [], topIncome: [], transfers: [], loans: [], investments: [],
        isCurrentMonth: m === currentMonthStr
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
            }).sort((a, b) => {
              const orderA = categoryOrderMap.has(a.category) ? categoryOrderMap.get(a.category).order : Number.MAX_SAFE_INTEGER;
              const orderB = categoryOrderMap.has(b.category) ? categoryOrderMap.get(b.category).order : Number.MAX_SAFE_INTEGER;
              if (orderA !== orderB) return orderA - orderB;
              return a.category.localeCompare(b.category);
            });
        } else {
            current.incomeGrowth = 0; current.expenseGrowth = 0;
            current.catComparison = Object.keys(current.categories).map(cat => {
                const currAmt = parseFloat(current.categories[cat]);
                return { category: cat, current: currAmt, previous: 0, diff: currAmt, pct: 100 };
            }).sort((a, b) => {
              const orderA = categoryOrderMap.has(a.category) ? categoryOrderMap.get(a.category).order : Number.MAX_SAFE_INTEGER;
              const orderB = categoryOrderMap.has(b.category) ? categoryOrderMap.get(b.category).order : Number.MAX_SAFE_INTEGER;
              if (orderA !== orderB) return orderA - orderB;
              return a.category.localeCompare(b.category);
            });
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

app.get('/api/reports/monthly', async (req, res) => { try { res.json(await generateMonthlyReportData()); } catch (e) { res.status(500).json({ error: e.message }); } });

app.get('/api/reports/monthly/:month/download', async (req, res) => {
  const { month } = req.params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM.' });
  }

  try {
    const monthlyReports = await generateMonthlyReportData();
    const report = monthlyReports.find((item) => item.month === month);

    if (!report) return res.status(404).json({ error: 'No report data available for this month.' });

    const incomeTx = (await pool.query(`
      SELECT i.id, i.source, i.amount, i.date,
             b.name AS bank_name,
             act.name AS account_type
      FROM income i
      LEFT JOIN savings_accounts s ON i.account_id = s.id
      LEFT JOIN banks b ON s.bank_id = b.id
      LEFT JOIN account_types act ON s.account_type_id = act.id
      WHERE i.status != 'DELETED' AND TO_CHAR(i.date, 'YYYY-MM') = $1
      ORDER BY i.date DESC, i.id DESC
    `, [month])).rows;

    const expenseTx = (await pool.query(`
      SELECT e.id, e.amount, e.description, e.date,
             c.name AS category,
             b.name AS bank_name,
             act.name AS account_type,
             cc.name AS credit_card_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      LEFT JOIN savings_accounts s ON e.account_id = s.id
      LEFT JOIN banks b ON s.bank_id = b.id
      LEFT JOIN account_types act ON s.account_type_id = act.id
      LEFT JOIN credit_cards cc ON e.credit_card_id = cc.id
      WHERE e.status != 'DELETED' AND TO_CHAR(e.date, 'YYYY-MM') = $1
      ORDER BY e.date DESC, e.id DESC
    `, [month])).rows;

    const bankStatements = (await pool.query(`
      SELECT s.id,
             b.name AS bank_name,
             act.name AS account_type,
             s.currency,
             s.balance
      FROM savings_accounts s
      JOIN banks b ON s.bank_id = b.id
      LEFT JOIN account_types act ON s.account_type_id = act.id
      ORDER BY b.name, act.name NULLS LAST, s.id
    `)).rows;

    const creditUsage = (await pool.query(`
      SELECT
        cc.id,
        cc.name,
        cc.limit_amount,
        cc.balance,
        COALESCE(SUM(e.amount) FILTER (WHERE TO_CHAR(e.date, 'YYYY-MM') = $1 AND e.status != 'DELETED'), 0) AS monthly_spend
      FROM credit_cards cc
      LEFT JOIN expenses e ON e.credit_card_id = cc.id
      GROUP BY cc.id, cc.name, cc.limit_amount, cc.balance
      ORDER BY cc.name
    `, [month])).rows;

    const transfers = (await pool.query(`
      SELECT t.id, t.date, t.recipient, t.amount, t.inr_amount, t.method,
             rb.name AS recipient_bank,
             b.name AS source_bank,
             act.name AS source_account_type
      FROM transfers t
      LEFT JOIN savings_accounts s ON t.source_account_id = s.id
      LEFT JOIN banks b ON s.bank_id = b.id
      LEFT JOIN account_types act ON s.account_type_id = act.id
      LEFT JOIN recipient_banks rb ON t.recipient_bank_id = rb.id
      WHERE t.status != 'DELETED' AND TO_CHAR(t.date, 'YYYY-MM') = $1
      ORDER BY t.date DESC, t.id DESC
    `, [month])).rows;

    const lending = (await pool.query(`
      SELECT l.id, l.date, l.recipient, l.amount, l.repaid, l.method,
             rb.name AS recipient_bank,
             b.name AS source_bank,
             act.name AS source_account_type
      FROM lending l
      LEFT JOIN savings_accounts s ON l.source_account_id = s.id
      LEFT JOIN banks b ON s.bank_id = b.id
      LEFT JOIN account_types act ON s.account_type_id = act.id
      LEFT JOIN recipient_banks rb ON l.recipient_bank_id = rb.id
      WHERE l.status != 'DELETED' AND TO_CHAR(l.date, 'YYYY-MM') = $1
      ORDER BY l.date DESC, l.id DESC
    `, [month])).rows;

    const investmentChanges = (await pool.query(`
      WITH month_logs AS (
        SELECT
          il.investment_id,
          i.name,
          i.type,
          il.date,
          il.balance,
          il.net_contribution,
          ROW_NUMBER() OVER (PARTITION BY il.investment_id ORDER BY il.date DESC, il.id DESC) AS rn
        FROM investment_logs il
        JOIN investments i ON i.id = il.investment_id
        WHERE il.status != 'DELETED'
          AND i.status != 'DELETED'
          AND TO_CHAR(il.date, 'YYYY-MM') = $1
      ),
      prev_logs AS (
        SELECT DISTINCT ON (il.investment_id)
          il.investment_id,
          il.balance AS previous_balance
        FROM investment_logs il
        WHERE il.status != 'DELETED'
          AND TO_CHAR(il.date, 'YYYY-MM') < $1
        ORDER BY il.investment_id, il.date DESC, il.id DESC
      )
      SELECT
        ml.investment_id,
        ml.name,
        ml.type,
        ml.date,
        ml.balance,
        ml.net_contribution,
        COALESCE(pl.previous_balance, 0) AS previous_balance,
        (ml.balance - COALESCE(pl.previous_balance, 0) - COALESCE(ml.net_contribution, 0)) AS gain_loss
      FROM month_logs ml
      LEFT JOIN prev_logs pl ON pl.investment_id = ml.investment_id
      WHERE ml.rn = 1
      ORDER BY ml.name
    `, [month])).rows;

    const payload = {
      month,
      summary: {
        income: Number(report.income || 0),
        expense: Number(report.expense || 0),
        net: Number(report.net || 0),
        savingsRate: Number(report.savingsRate || 0),
        incomeGrowth: Number(report.incomeGrowth || 0),
        expenseGrowth: Number(report.expenseGrowth || 0),
      },
      categoryComparison: report.catComparison || [],
      accountActivity: report.accounts || {},
      incomeTransactions: incomeTx,
      expenseTransactions: expenseTx,
      bankStatements,
      creditCardUsage: creditUsage,
      investmentChanges,
      transfers,
      lending,
      generatedAt: new Date().toISOString(),
      timezone: process.env.TZ || 'UTC',
    };

    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const runHistoricalBackfill = async () => {};

app.post('/api/reports/analyze/:month', async (req, res) => { res.status(410).json({ error: 'AI insights have been removed.' }); });

cron.schedule('0 10 1 * *', async () => {});

cron.schedule('0 2 * * *', async () => {});

// ==========================================
// DASHBOARD SUMMARY
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

const PORT = 5000;
app.listen(PORT, async () => { 
  logger.info(`Security Core Online on port ${PORT}`); 
});