-- ============================================================================
-- Dhanapālana - 36 Month Volume Testing Data Seed
-- ============================================================================
-- Generates 3 years of programmatic financial data (Mar 2023 - Feb 2026)
-- Uses PostgreSQL generate_series to test UI performance and AI analytics depth

BEGIN;

-- ---------------------------------------------------------
-- 1. PREREQUISITE REFERENCE DATA
-- ---------------------------------------------------------
INSERT INTO banks (id, name) VALUES (1, 'TD'), (2, 'CIBC'), (5, 'WealthSimple') ON CONFLICT (id) DO NOTHING;
INSERT INTO recipient_banks (id, name) VALUES (1, 'HDFC Bank') ON CONFLICT (id) DO NOTHING;
INSERT INTO account_types (id, name) VALUES (1, 'Chequing'), (2, 'Savings') ON CONFLICT (id) DO NOTHING;
INSERT INTO credit_cards (id, name, limit_amount, balance) VALUES (1, 'PC Financial', 5000.00, 0.00) ON CONFLICT (id) DO NOTHING;

SELECT setval('banks_id_seq', (SELECT MAX(id) FROM banks));
SELECT setval('recipient_banks_id_seq', (SELECT MAX(id) FROM recipient_banks));
SELECT setval('account_types_id_seq', (SELECT MAX(id) FROM account_types));
SELECT setval('credit_cards_id_seq', (SELECT MAX(id) FROM credit_cards));

-- ---------------------------------------------------------
-- 2. ACCOUNT CREATION
-- ---------------------------------------------------------
INSERT INTO savings_accounts (id, bank_id, account_type_id, currency, balance) VALUES 
    (1, 1, 1, 'CAD', 12500.00),
    (2, 2, 2, 'CAD', 35000.00)
ON CONFLICT (id) DO NOTHING;
SELECT setval('savings_accounts_id_seq', (SELECT MAX(id) FROM savings_accounts));

INSERT INTO investments (id, name, bank_id, type, account_type_id, status) VALUES 
    (1, 'WealthSimple TFSA', 5, 'TFSA', 2, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;
SELECT setval('investments_id_seq', (SELECT MAX(id) FROM investments));

-- ---------------------------------------------------------
-- 3. 36 MONTHS OF INCOME (Fixed: 1st and 15th of the month)
-- ---------------------------------------------------------
INSERT INTO income (source, amount, account_id, date)
SELECT 'Tech Corp Salary', 5000.00, 1, d::date
FROM generate_series('2023-03-01'::date, '2026-02-01'::date, '1 month'::interval) as d;

INSERT INTO income (source, amount, account_id, date)
SELECT 'Freelance Client', 1500.00, 1, d::date
FROM generate_series('2023-03-15'::date, '2026-02-15'::date, '1 month'::interval) as d;

-- ---------------------------------------------------------
-- 4. 36 MONTHS OF EXPENSES (Fixed & Randomized)
-- ---------------------------------------------------------
-- Fixed Monthly Rent (Category 1)
INSERT INTO expenses (amount, category_id, account_id, description, date)
SELECT 1800.00, 1, 1, 'Monthly Rent', d::date
FROM generate_series('2023-03-01'::date, '2026-02-01'::date, '1 month'::interval) as d;

-- Fixed Monthly Utilities (Category 2)
INSERT INTO expenses (amount, category_id, account_id, description, date)
SELECT 150.00, 2, 1, 'Hydro/Water Bill', d::date
FROM generate_series('2023-03-05'::date, '2026-02-05'::date, '1 month'::interval) as d;

-- Randomized Groceries every 6 days (Category 7) - Generates ~180 records
INSERT INTO expenses (amount, category_id, account_id, description, date)
SELECT ROUND((RANDOM() * 100 + 50)::numeric, 2), 7, 1, 'Supermarket Run', d::date
FROM generate_series('2023-03-02'::date, '2026-02-28'::date, '6 days'::interval) as d;

-- Randomized Dining Out/Food every 4 days (Category 8) - Generates ~270 records
INSERT INTO expenses (amount, category_id, account_id, description, date)
SELECT ROUND((RANDOM() * 60 + 15)::numeric, 2), 8, 1, 'Restaurants/Takeout', d::date
FROM generate_series('2023-03-03'::date, '2026-02-28'::date, '4 days'::interval) as d;

-- Credit Card Shopping every 10 days (Category 9) - Generates ~108 records
INSERT INTO expenses (amount, category_id, credit_card_id, description, date)
SELECT ROUND((RANDOM() * 150 + 20)::numeric, 2), 9, 1, 'Amazon / Retail', d::date
FROM generate_series('2023-03-10'::date, '2026-02-28'::date, '10 days'::interval) as d;

-- ---------------------------------------------------------
-- 5. 36 MONTHS OF TRANSFERS
-- ---------------------------------------------------------
INSERT INTO transfers (source_account_id, recipient, recipient_bank_id, amount, exchange_rate, inr_amount, method, date)
SELECT 1, 'Family Support', 1, 500.00, 61.50, 30750.00, 'Remitly', d::date
FROM generate_series('2023-03-25'::date, '2026-02-25'::date, '1 month'::interval) as d;

-- ---------------------------------------------------------
-- 6. 36 MONTHS OF INVESTMENT LOGS (Simulating Market Growth)
-- ---------------------------------------------------------
-- Uses a recursive formula: Starts at $10k. Every month adds $500 contribution and simulates 0.8% market gain.
WITH RECURSIVE inv_growth AS (
    SELECT 
        '2023-03-28'::date as log_date, 
        10500.00::numeric as balance, 
        500.00::numeric as contrib
    UNION ALL
    SELECT 
        (log_date + interval '1 month')::date,
        ROUND((balance * 1.008 + 500.00)::numeric, 2),
        500.00::numeric
    FROM inv_growth
    WHERE log_date < '2026-02-28'::date
)
INSERT INTO investment_logs (investment_id, date, balance, net_contribution)
SELECT 1, log_date, balance, contrib FROM inv_growth;

COMMIT;