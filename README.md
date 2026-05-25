# 💰 Dhanapalana

A comprehensive personal finance management web application with AI-powered insights and automated reporting.

## 📊 Overview

Dhanapalana is a full-stack web application designed to help individuals track, analyze, and optimize their personal finances. Built with modern web technologies and featuring an integrated AI assistant, it provides tools for managing income, expenses, savings, investments, transfers, and lending transactions.

## ✨ Features

- **📈 Comprehensive Financial Tracking**: Log and categorize income, expenses, savings accounts, credit cards, investments, transfers, and lending
- **🤖 AI-Powered Insights**: Vittaparāmarśadātā AI assistant generates monthly financial analysis, recommendations, and answers conversational Telegram queries with full context memory
- **📊 Automated Reporting**: Monthly reports with charts, trends, and year-over-year comparisons
- **📌 Accurate Monthly Category Reports**: Expense categories only show actual spend for that month, with previous-month comparison for active categories
- **🔐 Secure Authentication**: JWT-based auth with multi-factor authentication (MFA) support
- **🔔 Real-time Notifications**: System alerts and financial activity notifications
- **💾 Automated Backups**: Scheduled database backups with restore capabilities
- **📱 Telegram Integration**: Remote financial queries via Telegram bot
- **🎨 Responsive Design**: Modern glassmorphism UI with dark/light theme support
- **📈 Data Visualization**: Interactive charts and graphs using Recharts
- **📝 Audit Logging**: Complete system activity tracking for security and compliance

## 🛠️ Technology Stack

### 🎨 Frontend
- **⚛️ React.js 18.2.0** - Component-based UI framework
- **🧭 React Router DOM 6.20.0** - Client-side routing
- **📡 Axios 1.6.0** - HTTP client for API communication
- **📊 Recharts 2.10.0** - Data visualization library

### 🚀 Backend
- **🟢 Node.js** - JavaScript runtime
- **⚡ Express.js 4.18.2** - Web framework for REST API
- **🐘 PostgreSQL 13** - Relational database
- **🔑 JWT** - Token-based authentication
- **🔒 bcryptjs** - Password hashing
- **📋 Winston** - Logging framework

### 🤖 AI & Integrations
- **🧠 Ollama** - Local AI model hosting
- **🎯 Qwen2.5 7B** - AI model for financial analysis and conversational queries (upgraded from Qwen2.5 Coder 3B)
- **🌐 Ngrok** - Secure tunneling
- **💬 Telegram Bot API** - Remote conversational assistant

### 🏗️ Infrastructure
- **🐳 Docker & Docker Compose** - Containerization and orchestration
- **🌐 Nginx** - Reverse proxy and load balancer
- **🔐 OpenSSL** - SSL certificate management

## 📋 Prerequisites

- 🐳 Docker and Docker Compose
- 🟢 Node.js 16+ (for local development)
- 📚 Git

## 🚀 Installation

1. **📥 Clone the repository:**
   ```bash
   git clone <repository-url>
   cd dhanapalana
   ```

2. **⚙️ Set up environment variables:**
   Create a `.env` file in the project root:
   ```env
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   JWT_SECRET=your_jwt_secret
   TELEGRAM_BOT_TOKEN=your_telegram_token
   NGROK_TOKEN=your_ngrok_token
   ```

3. **📦 Install dependencies:**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

4. **🔐 Generate SSL certificates (for production):**
   ```bash
   cd nginx_setup/nginx-certs
   # Follow HowTo.txt for certificate generation
   ```

5. **▶️ Start the application:**
   ```bash
   # From project root
   docker-compose up --build
   ```

6. **🌐 Access the application:**
   Open `https://localhost` in your browser

## 💻 Local Development

- **🎨 Frontend:** `cd frontend && npm start` (runs on port 3000)
- **🚀 Backend:** `cd backend && npm start` (runs on port 5000)
- **🐘 Database:** PostgreSQL runs in Docker container

## 📚 API Documentation

### 🔐 Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/mfa/enable` - Enable MFA

### 💰 Financial Data
- `GET /api/dashboard/summary` - Dashboard overview
- `GET /api/income` - List income entries
- `POST /api/income` - Add income entry
- `GET /api/expenses` - List expense entries
- `POST /api/expenses` - Add expense entry
- `GET /api/savings` - List savings accounts
- `POST /api/savings` - Add savings account

### 📊 Reports & Analytics
- `GET /api/reports/monthly` - Monthly financial reports
- `POST /api/reports/analyze/:month` - Generate AI analysis

### ⚙️ System Management (Admin)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/backups` - List backups
- `POST /api/backups/manual` - Create backup

## 🚀 Deployment

### 🐳 Docker Deployment
```bash
docker-compose up --build -d
```

### ⚙️ Production Configuration
- Update `nginx.conf` with your domain
- Configure SSL certificates
- Set up automated backups
- Configure firewall rules

### 🔧 Environment Variables
- `DB_USER`: PostgreSQL username
- `DB_PASSWORD`: PostgreSQL password
- `DB_NAME`: Database name
- `JWT_SECRET`: JWT signing secret
- `TELEGRAM_BOT_TOKEN`: Telegram bot token (optional)
- `NGROK_TOKEN`: Ngrok authentication token (optional)
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of extra allowed CORS origins (optional, e.g. `https://myapp.example.com`)

## 🛡️ Security Features

- **🔐 Multi-Factor Authentication (MFA)** with TOTP
- **📝 Password Policies**: 12+ characters with complexity requirements
- **🔑 JWT Token Authentication** with expiration
- **⏰ Auto-logout** after 5 minutes of inactivity
- **🔒 Encrypted Database Backups**
- **📋 Audit Logging** for all system activities
- **🌐 Network Isolation** using Docker networks
- **🛡️ Security Headers** (HSTS, X-Frame-Options, etc.)

## 📖 Usage

1. **👤 Register/Login:** Create an account or log in with existing credentials
2. **🔐 Set up MFA:** Enable two-factor authentication for enhanced security
3. **🏷️ Configure Categories:** Set up expense categories and account types
4. **💵 Add Financial Data:** Log income, expenses, and manage accounts
5. **📊 View Reports:** Access monthly reports with AI insights
6. **💾 Manage Backups:** Schedule automated backups and restore when needed

## 🤖 Telegram Bot Integration

The Telegram bot is a full conversational assistant — it remembers context within a session, so you can ask follow-up questions naturally.

Configure and use:

1. 🤖 Create a bot with @BotFather on Telegram
2. ⚙️ Set the bot token in environment variables
3. 💬 Ask natural language financial questions:
   - _"How much did I spend on groceries last month?"_
   - _"And how does that compare to this month?"_ ← follow-up works
   - _"What are my top 5 expenses this year?"_
4. 🔄 Send `/reset` to clear the conversation history and start fresh

> **Note:** Conversation history resets automatically after 30 minutes of inactivity.

## 🏗️ Architecture

```
👤 User → 🌐 Nginx (SSL) → 🎨 Frontend (React)
                    ↓
             🚀 Backend (Express.js) ↔ 🐘 PostgreSQL
                    ↓
             🤖 AI Engine (Ollama) → 🧠 Vittaparāmarśadātā
```

## 🤝 Contributing

1. 🍴 Fork the repository
2. 🌿 Create a feature branch
3. 🔧 Make your changes
4. ✅ Test thoroughly
5. 📤 Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- 📖 Check the documentation
- 📋 Review Docker logs: `docker-compose logs`
- ❤️ Check system health: `GET /api/system/health`

## 📅 Changelog

### Version 1.0.0
- 🎉 Initial release with core financial tracking features
- 🤖 AI-powered monthly insights
- 🐳 Docker containerization
- 🔐 MFA and security features
- 💬 Telegram bot integration

### 2026-05-16
- Fixed monthly report category logic so only categories with actual spend in the selected month are shown.
- Updated monthly report comparison logic to compare active categories against the previous month without displaying zero-spend categories.

### 2026-05-02 (In-progress updates)
- Added `ai_query_examples` persistence table and AI prompt examples storage.
- Implemented Admin panel "AI Query Designer" for CRUD management of plain-English → SQL training examples.
- Migrated prompt examples from hardcoded backend content into DB-driven examples for Telegram/AI generation.
- Added `/api/ai-examples` CRUD and `/api/ai-examples/generate` + `/api/ai-examples/test` endpoints.
- Added schema browser, live SQL test runner, and placeholder-aware date support in the Admin UI.
- Improved Admin UI button visibility and added a loading spinner during SQL generation.
- Added backend fallback generation path when AI returns empty SQL, with expanded prompt handling.
- Note: SQL generation may still fail for some prompts; investigation and debugging are paused until the next session.

---

**📝 Note:** This application is designed for personal use. For production deployment, ensure proper security configurations and regular backups.</content>
<parameter name="filePath">c:\Users\sagar\Downloads\Dhanapalana\README.md