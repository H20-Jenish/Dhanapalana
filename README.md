# 💰 Dhanapalana

A comprehensive personal finance management web application with automated insights and reporting.

## 📊 Overview

Dhanapalana is a full-stack web application designed to help individuals track, analyze, and optimize their personal finances. Built with modern web technologies and featuring integrated automation, it provides tools for managing income, expenses, savings, investments, transfers, and lending transactions.

## ✨ Features

- **📈 Comprehensive Financial Tracking**: Log and categorize income, expenses, savings accounts, credit cards, investments, transfers, and lending
- **🤖 Automated Insights**: The insights engine generates monthly financial analysis, recommendations, and answers conversational Telegram queries with full context memory
- **📊 Automated Reporting**: Monthly reports with charts, trends, and year-over-year comparisons
- **📥 Downloadable Monthly Packs**: One-click monthly summary export with summary, income, expenses, bank balances, credit usage, investment changes, transfers, and lending details
- **📌 Accurate Monthly Category Reports**: Expense categories only show actual spend for that month, with previous-month comparison for active categories
- **🔐 Secure Authentication**: JWT-based auth with multi-factor authentication (MFA) support
- **🔔 Real-time Notifications**: System alerts and financial activity notifications
- **💾 Automated Backups**: Scheduled database backups with restore capabilities
- **📱 Telegram Integration**: Remote financial queries via Telegram bot
- **🔔 Investment Reminder Engine**: Per-asset reminder cadence (daily/weekly/biweekly/monthly/custom days) with Telegram delivery
- **🧾 Investment Log Keeper**: Per-investment historical value/contribution log with gain/loss tracking
- **💼 Stock Holdings View**: Dedicated holdings modal with per-symbol invested amount, shares, current price/value, and unrealized return
- **🧮 Stock Update Workflows**: Structured update flow for additional purchases and dividend reinvestments with auto-calculated shares (editable)
- **🗂️ Unified Investment Timeline**: Logs view now combines performance logs and activity updates in one readable timeline
- **🪟 Consistent Modal UX**: Native browser popups replaced by in-app modal dialogs for confirm/prompt/alert flows
- **🎨 Responsive Design**: Modern glassmorphism UI optimized for desktop and mobile
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

### 🤖 Integrations
- **🌐 Ngrok** - Secure tunneling
- **💬 Telegram Bot API** - Remote conversational interface

### 🏗️ Infrastructure
- **🐳 Docker & Docker Compose** - Containerization and orchestration
- **🌐 Nginx** - Reverse proxy and load balancer
- **🔐 OpenSSL** - SSL certificate management

## 📋 Prerequisites

- 🐳 Docker Desktop with Docker Compose support
- 🟢 Node.js 16+ (for local development)
- 📚 Git
- 🔑 A valid `JWT_SECRET` value

## 🚀 Installation

1. **📥 Clone the repository:**
   ```bash
   git clone https://github.com/H20-Jenish/Dhanapalana.git
   cd Dhanapalana
   ```

2. **⚙️ Set up environment variables:**
   Create a `.env` file in the project root and add values for your database and auth settings:
   ```env
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   JWT_SECRET=your_jwt_secret
   TELEGRAM_BOT_TOKEN=your_telegram_token
   NGROK_TOKEN=your_ngrok_token
   CORS_ALLOWED_ORIGINS=http://localhost:3000
   ```

3. **📦 Install dependencies for local development (optional):**
   ```bash
   cd backend
   npm install

   cd ../frontend
   npm install
   ```

4. **▶️ Start the application using Docker Compose (recommended):**
   ```bash
   cd ..
   docker compose up --build -d
   ```

5. **🌐 Access the application:**
   - App (recommended): `https://localhost:4043`
   - API base via Nginx: `https://localhost:4043/api`
   - Direct container ports for backend/frontend are not published by default in this compose setup

6. **🔧 Stop the application:**
   ```bash
   docker compose down
   ```

## 💻 Local Development

If you want to run the frontend and backend separately for development:

- **Frontend:**
  ```bash
  cd frontend
  npm start
  ```
- **Backend:**
  ```bash
  cd backend
  npm start
  ```

> When running locally, ensure your `.env` file points to the same database used by the backend container or change database connection settings accordingly.

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
- `GET /api/reports/monthly/:month/download` - Full monthly downloadable payload (YYYY-MM)
- `POST /api/reports/analyze/:month` - Analyze monthly report

### 📈 Investments & Reminders
- `GET /api/investments/:id/logs` - Investment log history for an asset
- `GET /api/investments/:id/activity` - Investment activity history (asset creation/update/delete and position events)
- `GET /api/investments/:id/holdings/live` - Live per-symbol holdings metrics for stock/ETF assets
- `POST /api/investments/:id/positions` - Add stock/ETF position event (initial/additional purchase/dividend reinvestment)
- `GET /api/investment-reminders` - List per-asset reminder settings
- `POST /api/investment-reminders` - Create or update per-asset reminder settings
- `GET /api/system-settings/investment-reminders` - Read global reminder send time and timezone
- `POST /api/system-settings/investment-reminders` - Update global reminder send time and timezone

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
- `APP_TIMEZONE`: Global container timezone for frontend/backend/db/nginx and reminder defaults (optional, default `America/Toronto`)

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
5. **📊 View Reports:** Access monthly reports with automated insights
6. **💾 Manage Backups:** Schedule automated backups and restore when needed

## 🤖 Telegram Bot Integration

The Telegram bot is a full conversational interface with session memory, so you can ask follow-up questions naturally.

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
             🤖 Analysis Engine → 📈 Monthly Insights
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
- 🤖 Automated monthly insights
- 🐳 Docker containerization
- 🔐 MFA and security features
- 💬 Telegram bot integration

### 2026-05-16
- Fixed monthly report category logic so only categories with actual spend in the selected month are shown.
- Updated monthly report comparison logic to compare active categories against the previous month without displaying zero-spend categories.

### 2026-05-31
- Standardized timezone handling across all containers through `APP_TIMEZONE` mapped to `TZ`.
- Installed timezone data in backend and frontend images to ensure correct local time behavior.
- Added full monthly summary download API (`/api/reports/monthly/:month/download`).
- Added per-card "Download Summary" action in Monthly Reports UI to export detailed month data.
- Added investment log keeper support and reminder scheduling enhancements (time + timezone + per-asset cadence).
- Replaced remaining native popup behavior with in-app modal dialog flows.

### 2026-06-07
- Changed HTTPS host port mapping from `443` to `4043` (`4043:443`) for the Nginx service.
- Updated backend CORS allowlist to include `https://localhost:4043` and `https://127.0.0.1:4043` (plus HTTP variants) to fix login failures after the port change.

### 2026-05-02 (In-progress updates)
- Added `query_examples` persistence table and prompt example storage.
- Implemented Admin panel "Query Designer" for CRUD management of plain-English → SQL training examples.
- Migrated prompt examples from hardcoded backend content into DB-driven examples for Telegram generation.
- Added `/api/query-examples` CRUD and `/api/query-examples/generate` + `/api/query-examples/test` endpoints.
- Added schema browser, live SQL test runner, and placeholder-aware date support in the Admin UI.
- Improved Admin UI button visibility and added a loading spinner during SQL generation.
- Added backend fallback generation path when SQL generation returns empty output, with expanded prompt handling.
- Note: SQL generation may still fail for some prompts; investigation and debugging are paused until the next session.

### 2026-07-08
- Redesigned Investment cards to a uniform premium layout with consistent visual height and better metric hierarchy.
- Added stock/ETF holdings modal for clear per-symbol visibility (invested amount, shares, current price, current value, unrealized return).
- Added structured stock update flow with two mutually exclusive actions: additional purchase and dividend reinvestment.
- Extended investment position events with `transaction_type` to track initial purchase, additional purchase, and dividend reinvestment.
- Unified Log Keeper timeline by combining performance logs and investment activity entries in one stream.
- Replaced raw JSON log rendering with human-readable sections for changed values, old values, and new values.
- Improved activity logging coverage for investment edits, including deleted performance logs.

---

**📝 Note:** This application is designed for personal use. For production deployment, ensure proper security configurations and regular backups.</content>
<parameter name="filePath">c:\Users\sagar\Downloads\Dhanapalana\README.md