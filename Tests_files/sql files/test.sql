-- ============================================================================
-- Dhanapālana - AI & Dashboard Test Data Seed (Self-Contained)
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. PREREQUISITE REFERENCE DATA (Fixes the Foreign Key Errors)
-- ---------------------------------------------------------
-- Ensure necessary Banks exist
INSERT INTO banks (id, name) VALUES 
    (1, 'TD'), (2, 'CIBC'), (5, 'WealthSimple') 
ON CONFLICT (id) DO NOTHING;

-- Ensure necessary Recipient Banks exist
INSERT INTO recipient_banks (id, name) VALUES 
    (1, 'HDFC Bank') 
ON CONFLICT (id) DO NOTHING;

-- Ensure necessary Account Types exist
INSERT INTO account_types (id, name) VALUES 
    (1, 'Chequing'), (2, 'Savings') 
ON CONFLICT (id) DO NOTHING;

-- Ensure necessary Credit Cards exist
INSERT INTO credit_cards (id, name, limit_amount, balance) VALUES 
    (1, 'PC Financial', 5000.00, 0.00) 
ON CONFLICT (id) DO NOTHING;

-- Reset identity sequences so future UI additions don't hit ID collisions
SELECT setval('banks_id_seq', (SELECT MAX(id) FROM banks));
SELECT setval('recipient_banks_id_seq', (SELECT MAX(id) FROM recipient_banks));
SELECT setval('account_types_id_seq', (SELECT MAX(id) FROM account_types));
SELECT setval('credit_cards_id_seq', (SELECT MAX(id) FROM credit_cards));

-- ---------------------------------------------------------
-- 2. ACCOUNT CREATION
-- ---------------------------------------------------------
INSERT INTO savings_accounts (id, bank_id, account_type_id, currency, balance) 
VALUES 
    (1, 1, 1, 'CAD', 8500.00),
    (2, 2, 2, 'CAD', 15000.00)
ON CONFLICT (id) DO NOTHING;

SELECT setval('savings_accounts_id_seq', (SELECT MAX(id) FROM savings_accounts));

-- ---------------------------------------------------------
-- 3. INVESTMENT PORTFOLIO
-- ---------------------------------------------------------
INSERT INTO investments (id, name, bank_id, type, account_type_id, status)
VALUES (1, 'WealthSimple TFSA', 5, 'TFSA', 2, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

SELECT setval('investments_id_seq', (SELECT MAX(id) FROM investments));

INSERT INTO investment_logs (investment_id, date, balance, net_contribution)
VALUES (1, '2026-01-31', 10000.00, 10000.00);

INSERT INTO investment_logs (investment_id, date, balance, net_contribution)
VALUES (1, '2026-02-28', 11000.00, 500.00);

-- ---------------------------------------------------------
-- 4. JANUARY 2026 TRANSACTIONS (Base Month)
-- ---------------------------------------------------------
INSERT INTO income (source, amount, account_id, date) 
VALUES ('Tech Corp Salary', 5000.00, 1, '2026-01-15');

-- Categories: 1=Rent, 7=Grocery, 2=Utilities
INSERT INTO expenses (amount, category_id, account_id, description, date) VALUES 
    (1500.00, 1, 1, 'January Rent', '2026-01-01'),
    (400.00, 7, 1, 'Walmart Groceries', '2026-01-10'),
    (120.00, 2, 1, 'Hydro Bill', '2026-01-18');

-- ---------------------------------------------------------
-- 5. FEBRUARY 2026 TRANSACTIONS (Target Analysis Month)
-- ---------------------------------------------------------
INSERT INTO income (source, amount, account_id, date) 
VALUES ('Tech Corp Salary', 5200.00, 1, '2026-02-15');

INSERT INTO expenses (amount, category_id, account_id, description, date) VALUES 
    (1500.00, 1, 1, 'February Rent', '2026-02-01'),
    (750.00, 7, 1, 'Whole Foods Overspending', '2026-02-12'),
    (95.00, 2, 1, 'Hydro Bill', '2026-02-18');

INSERT INTO expenses (amount, category_id, credit_card_id, description, date) 
VALUES (200.00, 9, 1, 'Amazon Shopping', '2026-02-20');

-- ---------------------------------------------------------
-- 6. MOVEMENTS (Transfers & Lending)
-- ---------------------------------------------------------
INSERT INTO transfers (source_account_id, recipient, recipient_bank_id, amount, exchange_rate, inr_amount, method, date)
VALUES (1, 'Family Support', 1, 500.00, 61.50, 30750.00, 'Remitly', '2026-02-25');

INSERT INTO lending (source_account_id, recipient, amount, method, repaid, date)
VALUES (1, 'John Doe', 300.00, 'e-Transfer', 0.00, '2026-02-26');

COMMIT;