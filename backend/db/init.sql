-- Dhanapālana Database Schema
-- Personal Finance Management System Database Initialization
-- PostgreSQL 13+ compatible schema with referential integrity
-- Author: Dhanapālana Development Team
-- Description: Complete database structure for financial tracking including users, accounts, transactions, and audit logs

-- ===========================================
-- 1. FOUNDATION TABLES
-- ===========================================
-- Core entities that other tables reference

-- User accounts with role-based access control
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,                    -- bcrypt hashed password
    role TEXT DEFAULT 'user'                   -- 'user' or 'admin'
);

-- Expense categories for transaction classification
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL                  -- e.g., 'Rent', 'Utilities', 'Food'
);

-- Financial institutions for savings accounts
CREATE TABLE banks (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL                  -- e.g., 'TD', 'CIBC', 'KOHO'
);

-- Recipient banks for international transfers
CREATE TABLE recipient_banks (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL                  -- e.g., 'HDFC Bank', 'ICICI Bank'
);

-- Account types for savings account classification
CREATE TABLE account_types (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL                  -- e.g., 'Chequing', 'Savings'
);

-- Credit card accounts with spending limits
CREATE TABLE credit_cards (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,                 -- Card name/identifier
    limit_amount DECIMAL(15,2) NOT NULL,       -- Credit limit in CAD
    balance DECIMAL(15,2) DEFAULT 0.00         -- Current outstanding balance
);

-- ===========================================
-- 2. ACCOUNT MANAGEMENT
-- ===========================================

-- Savings and chequing accounts linked to banks and account types
CREATE TABLE savings_accounts (
    id SERIAL PRIMARY KEY,
    bank_id INTEGER REFERENCES banks(id),      -- Foreign key to banks table
    account_type_id INTEGER REFERENCES account_types(id), -- Chequing/Savings type
    currency TEXT DEFAULT 'CAD',               -- Account currency (CAD, USD, etc.)
    balance DECIMAL(15,2) DEFAULT 0.00,        -- Current account balance
    is_system_managed BOOLEAN DEFAULT FALSE,
    management_source TEXT,
    linked_investment_id INTEGER
);

-- ===========================================
-- 3. FINANCIAL TRANSACTIONS
-- ===========================================

-- Income entries with source tracking and account deposits
CREATE TABLE income (
    id SERIAL PRIMARY KEY,
    source TEXT NOT NULL,                      -- Income source (e.g., 'Salary', 'Freelance')
    amount DECIMAL(10,2) NOT NULL,             -- Income amount in CAD
    account_id INTEGER REFERENCES savings_accounts(id), -- Account where money was deposited
    date DATE DEFAULT CURRENT_DATE             -- Date income was received
);

-- Expense entries with category classification and payment method tracking
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,             -- Expense amount in CAD
    category_id INTEGER REFERENCES categories(id), -- Expense category
    account_id INTEGER REFERENCES savings_accounts(id), -- Account debited (if paid from account)
    credit_card_id INTEGER REFERENCES credit_cards(id), -- Credit card used (if applicable)
    date DATE DEFAULT CURRENT_DATE,            -- Date expense occurred
    description TEXT                           -- Optional expense description
);

-- ===========================================
-- 4. MONEY MOVEMENT
-- ===========================================

-- Money transfers between accounts or to external recipients
CREATE TABLE transfers (
    id SERIAL PRIMARY KEY,
    source_account_id INTEGER REFERENCES savings_accounts(id), -- Source account
    recipient TEXT NOT NULL,                   -- Recipient name or identifier
    recipient_bank_id INTEGER REFERENCES recipient_banks(id), -- Recipient's bank (for international)
    amount DECIMAL(10,2) NOT NULL,             -- Transfer amount in CAD
    exchange_rate DECIMAL(10,2) DEFAULT 60.00, -- CAD to INR exchange rate
    inr_amount DECIMAL(15,2) NOT NULL,         -- Amount in INR (calculated)
    method TEXT NOT NULL,                      -- Transfer method (e.g., 'Wire', 'Internal')
    date DATE DEFAULT CURRENT_DATE             -- Transfer date
);

-- Money lent to others with repayment tracking
CREATE TABLE lending (
    id SERIAL PRIMARY KEY,
    source_account_id INTEGER REFERENCES savings_accounts(id), -- Account money came from
    recipient TEXT NOT NULL,                   -- Person who received the loan
    recipient_bank_id INTEGER REFERENCES recipient_banks(id), -- Recipient's bank (if applicable)
    amount DECIMAL(10,2) NOT NULL,             -- Loan amount in CAD
    method TEXT NOT NULL,                      -- Lending method (e.g., 'Cash', 'Transfer')
    repaid DECIMAL(10,2) DEFAULT 0.00,         -- Amount repaid so far
    date DATE DEFAULT CURRENT_DATE             -- Loan date
);

-- ===========================================
-- 5. SYSTEM TABLES
-- ===========================================

-- Audit trail for system actions and changes
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    action_details TEXT,                       -- Description of the action performed
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- When the action occurred
);

-- ===========================================
-- 6. ADVANCED FEATURES TABLES
-- ===========================================

-- Auto-generated monthly financial insights
CREATE TABLE ai_monthly_insights (
    month TEXT PRIMARY KEY,                    -- Month in YYYY-MM format
    insights TEXT,                             -- Auto-generated insights
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- When insights were generated
);

-- Investment accounts for tracking portfolios
CREATE TABLE investments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,                        -- Investment account name
    bank_id INTEGER REFERENCES banks(id),      -- Associated bank
    type TEXT,                                 -- Legacy investment type label
    status TEXT DEFAULT 'ACTIVE',              -- Account status
    account_type_id INTEGER REFERENCES account_types(id), -- Legacy account type
    type_of_asset_id INTEGER,
    investment_type_id INTEGER
);

ALTER TABLE savings_accounts
    ADD CONSTRAINT savings_accounts_linked_investment_id_fkey
    FOREIGN KEY (linked_investment_id) REFERENCES investments(id);

-- Type of Asset master data (FHSA/TFSA/RRSP/RESP/etc.)
CREATE TABLE type_of_assets (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- Investment Type master data (Stocks/ETFs/Crypto/etc.)
CREATE TABLE investment_types (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

ALTER TABLE investments
    ADD CONSTRAINT investments_type_of_asset_id_fkey
    FOREIGN KEY (type_of_asset_id) REFERENCES type_of_assets(id);

ALTER TABLE investments
    ADD CONSTRAINT investments_investment_type_id_fkey
    FOREIGN KEY (investment_type_id) REFERENCES investment_types(id);

-- Logs for investment balance changes and contributions
CREATE TABLE investment_logs (
    id SERIAL PRIMARY KEY,
    investment_id INTEGER REFERENCES investments(id), -- Associated investment
    date DATE NOT NULL,                       -- Log date
    balance DECIMAL(15,2) NOT NULL,           -- Balance at this date
    net_contribution DECIMAL(15,2) DEFAULT 0.00, -- Net contribution
    status TEXT DEFAULT 'ACTIVE'              -- Log status
);

-- Position-level holdings for securities-style investments
CREATE TABLE investment_positions (
    id SERIAL PRIMARY KEY,
    investment_id INTEGER REFERENCES investments(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    unit_price DECIMAL(15,4) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    quantity DECIMAL(20,8) NOT NULL,
    purchase_date DATE DEFAULT CURRENT_DATE,
    priced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    price_source TEXT DEFAULT 'manual',
    transaction_type TEXT DEFAULT 'INITIAL_PURCHASE',
    status TEXT DEFAULT 'ACTIVE'
);

-- Timeline/activity entries for the Investment page
CREATE TABLE investment_activity_logs (
    id SERIAL PRIMARY KEY,
    investment_id INTEGER REFERENCES investments(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    summary TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    actor TEXT DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System notifications for users
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,                     -- Notification message
    is_read BOOLEAN DEFAULT FALSE,             -- Read status
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Creation timestamp
);

-- Password history for security auditing
CREATE TABLE password_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),      -- Associated user
    password_hash TEXT NOT NULL,               -- Hashed password
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- When password was set
);

-- System settings as key-value pairs
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,                      -- Setting key
    value TEXT                                 -- Setting value
);

-- Records of system backups
CREATE TABLE system_backups (
    id SERIAL PRIMARY KEY,
    version TEXT NOT NULL,                     -- Backup version
    filename TEXT NOT NULL,                    -- Backup filename
    notes TEXT,                                -- Optional notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Backup creation time
);

-- ===========================================
-- 7. INITIAL SEED DATA
-- ===========================================
-- Pre-populated data for immediate system usability

-- Default expense categories
INSERT INTO categories (name) VALUES
    ('Rent'), ('Utilities'), ('Installments'), ('Insurance'),
    ('Mobile Bill'), ('Gas'), ('Grocery'), ('Food'),
    ('Shopping'), ('Charging'), ('Personal Care'), ('Household'), ('Miscellaneous');

-- Canadian banks commonly used
INSERT INTO banks (name) VALUES ('TD'), ('CIBC'), ('KOHO'), ('Sunlife'), ('WealthSimple');

-- Indian banks for international transfers
INSERT INTO recipient_banks (name) VALUES ('HDFC Bank'), ('ICICI Bank'), ('SBI');

-- Sample credit cards with limits
INSERT INTO credit_cards (name, limit_amount) VALUES
    ('PC Financial', 5000.00),
    ('TD CASHBACK', 2500.00);

-- Account type classifications
INSERT INTO account_types (name) VALUES ('Chequing'), ('Savings');

-- Default investment taxonomy
INSERT INTO type_of_assets (name) VALUES ('FHSA'), ('TFSA'), ('RRSP'), ('RESP'), ('Non-Registered');
INSERT INTO investment_types (name) VALUES ('Stocks/ETFs'), ('Crypto'), ('Real Estate'), ('Mutual Funds');

-- ===========================================
-- 8. QUERY DESIGNER
-- ===========================================

-- Few-shot examples that teach the SQL generator how to convert natural language to SQL.
-- Managed via the Admin -> Query Designer panel. Included in all backups.
CREATE TABLE query_examples (
    id SERIAL PRIMARY KEY,
    question    TEXT NOT NULL,
    sql_query   TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);