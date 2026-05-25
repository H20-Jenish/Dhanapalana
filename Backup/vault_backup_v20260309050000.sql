--
-- PostgreSQL database dump
--

\restrict vxjbiaBFXEyBouQ4Vqvy9XLBMpBrxn6QUkomEAkjhDhwAjxt8uz4yyJXbE9CNeX

-- Dumped from database version 13.23 (Debian 13.23-1.pgdg13+1)
-- Dumped by pg_dump version 17.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.transfers DROP CONSTRAINT IF EXISTS transfers_source_account_id_fkey;
ALTER TABLE IF EXISTS ONLY public.transfers DROP CONSTRAINT IF EXISTS transfers_recipient_bank_id_fkey;
ALTER TABLE IF EXISTS ONLY public.savings_accounts DROP CONSTRAINT IF EXISTS savings_accounts_bank_id_fkey;
ALTER TABLE IF EXISTS ONLY public.savings_accounts DROP CONSTRAINT IF EXISTS savings_accounts_account_type_id_fkey;
ALTER TABLE IF EXISTS ONLY public.password_history DROP CONSTRAINT IF EXISTS password_history_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lending DROP CONSTRAINT IF EXISTS lending_source_account_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lending DROP CONSTRAINT IF EXISTS lending_recipient_bank_id_fkey;
ALTER TABLE IF EXISTS ONLY public.investments DROP CONSTRAINT IF EXISTS investments_bank_id_fkey;
ALTER TABLE IF EXISTS ONLY public.investments DROP CONSTRAINT IF EXISTS investments_account_type_id_fkey;
ALTER TABLE IF EXISTS ONLY public.investment_logs DROP CONSTRAINT IF EXISTS investment_logs_investment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.income DROP CONSTRAINT IF EXISTS income_account_id_fkey;
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS expenses_credit_card_id_fkey;
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS expenses_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS expenses_account_id_fkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.transfers DROP CONSTRAINT IF EXISTS transfers_pkey;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.system_backups DROP CONSTRAINT IF EXISTS system_backups_version_key;
ALTER TABLE IF EXISTS ONLY public.system_backups DROP CONSTRAINT IF EXISTS system_backups_pkey;
ALTER TABLE IF EXISTS ONLY public.savings_accounts DROP CONSTRAINT IF EXISTS savings_accounts_pkey;
ALTER TABLE IF EXISTS ONLY public.recipient_banks DROP CONSTRAINT IF EXISTS recipient_banks_pkey;
ALTER TABLE IF EXISTS ONLY public.password_history DROP CONSTRAINT IF EXISTS password_history_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.lending DROP CONSTRAINT IF EXISTS lending_pkey;
ALTER TABLE IF EXISTS ONLY public.investments DROP CONSTRAINT IF EXISTS investments_pkey;
ALTER TABLE IF EXISTS ONLY public.investment_logs DROP CONSTRAINT IF EXISTS investment_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.income DROP CONSTRAINT IF EXISTS income_pkey;
ALTER TABLE IF EXISTS ONLY public.expenses DROP CONSTRAINT IF EXISTS expenses_pkey;
ALTER TABLE IF EXISTS ONLY public.credit_cards DROP CONSTRAINT IF EXISTS credit_cards_pkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE IF EXISTS ONLY public.banks DROP CONSTRAINT IF EXISTS banks_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.ai_monthly_insights DROP CONSTRAINT IF EXISTS ai_monthly_insights_pkey;
ALTER TABLE IF EXISTS ONLY public.account_types DROP CONSTRAINT IF EXISTS account_types_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.transfers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.system_backups ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.savings_accounts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.recipient_banks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.password_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lending ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.investments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.investment_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.income ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.expenses ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.credit_cards ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.banks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.account_types ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.transfers_id_seq;
DROP TABLE IF EXISTS public.transfers;
DROP TABLE IF EXISTS public.system_settings;
DROP SEQUENCE IF EXISTS public.system_backups_id_seq;
DROP TABLE IF EXISTS public.system_backups;
DROP SEQUENCE IF EXISTS public.savings_accounts_id_seq;
DROP TABLE IF EXISTS public.savings_accounts;
DROP SEQUENCE IF EXISTS public.recipient_banks_id_seq;
DROP TABLE IF EXISTS public.recipient_banks;
DROP SEQUENCE IF EXISTS public.password_history_id_seq;
DROP TABLE IF EXISTS public.password_history;
DROP SEQUENCE IF EXISTS public.notifications_id_seq;
DROP TABLE IF EXISTS public.notifications;
DROP SEQUENCE IF EXISTS public.lending_id_seq;
DROP TABLE IF EXISTS public.lending;
DROP SEQUENCE IF EXISTS public.investments_id_seq;
DROP TABLE IF EXISTS public.investments;
DROP SEQUENCE IF EXISTS public.investment_logs_id_seq;
DROP TABLE IF EXISTS public.investment_logs;
DROP SEQUENCE IF EXISTS public.income_id_seq;
DROP TABLE IF EXISTS public.income;
DROP SEQUENCE IF EXISTS public.expenses_id_seq;
DROP TABLE IF EXISTS public.expenses;
DROP SEQUENCE IF EXISTS public.credit_cards_id_seq;
DROP TABLE IF EXISTS public.credit_cards;
DROP SEQUENCE IF EXISTS public.categories_id_seq;
DROP TABLE IF EXISTS public.categories;
DROP SEQUENCE IF EXISTS public.banks_id_seq;
DROP TABLE IF EXISTS public.banks;
DROP SEQUENCE IF EXISTS public.audit_logs_id_seq;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.ai_monthly_insights;
DROP SEQUENCE IF EXISTS public.account_types_id_seq;
DROP TABLE IF EXISTS public.account_types;
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: admin
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_types; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.account_types (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.account_types OWNER TO admin;

--
-- Name: account_types_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.account_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.account_types_id_seq OWNER TO admin;

--
-- Name: account_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.account_types_id_seq OWNED BY public.account_types.id;


--
-- Name: ai_monthly_insights; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.ai_monthly_insights (
    month text NOT NULL,
    insights text,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ai_monthly_insights OWNER TO admin;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    action_details text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_logs OWNER TO admin;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO admin;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: banks; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.banks (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.banks OWNER TO admin;

--
-- Name: banks_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.banks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.banks_id_seq OWNER TO admin;

--
-- Name: banks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.banks_id_seq OWNED BY public.banks.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.categories OWNER TO admin;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO admin;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: credit_cards; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.credit_cards (
    id integer NOT NULL,
    name text NOT NULL,
    limit_amount numeric(15,2) DEFAULT 0,
    balance numeric(15,2) DEFAULT 0
);


ALTER TABLE public.credit_cards OWNER TO admin;

--
-- Name: credit_cards_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.credit_cards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.credit_cards_id_seq OWNER TO admin;

--
-- Name: credit_cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.credit_cards_id_seq OWNED BY public.credit_cards.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    amount numeric(15,2),
    category_id integer,
    account_id integer,
    credit_card_id integer,
    description text,
    date date,
    status text DEFAULT 'ACTIVE'::text
);


ALTER TABLE public.expenses OWNER TO admin;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expenses_id_seq OWNER TO admin;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: income; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.income (
    id integer NOT NULL,
    source text,
    amount numeric(15,2),
    account_id integer,
    date date,
    status text DEFAULT 'ACTIVE'::text
);


ALTER TABLE public.income OWNER TO admin;

--
-- Name: income_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.income_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.income_id_seq OWNER TO admin;

--
-- Name: income_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.income_id_seq OWNED BY public.income.id;


--
-- Name: investment_logs; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.investment_logs (
    id integer NOT NULL,
    investment_id integer,
    date date NOT NULL,
    balance numeric(15,2) NOT NULL,
    net_contribution numeric(15,2) DEFAULT 0.00,
    status text DEFAULT 'ACTIVE'::text
);


ALTER TABLE public.investment_logs OWNER TO admin;

--
-- Name: investment_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.investment_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.investment_logs_id_seq OWNER TO admin;

--
-- Name: investment_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.investment_logs_id_seq OWNED BY public.investment_logs.id;


--
-- Name: investments; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.investments (
    id integer NOT NULL,
    name text NOT NULL,
    bank_id integer,
    type text NOT NULL,
    status text DEFAULT 'ACTIVE'::text,
    account_type_id integer
);


ALTER TABLE public.investments OWNER TO admin;

--
-- Name: investments_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.investments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.investments_id_seq OWNER TO admin;

--
-- Name: investments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.investments_id_seq OWNED BY public.investments.id;


--
-- Name: lending; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.lending (
    id integer NOT NULL,
    source_account_id integer,
    recipient text,
    recipient_bank_id integer,
    amount numeric(15,2),
    repaid numeric(15,2) DEFAULT 0,
    method text,
    date date,
    status text DEFAULT 'ACTIVE'::text
);


ALTER TABLE public.lending OWNER TO admin;

--
-- Name: lending_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.lending_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lending_id_seq OWNER TO admin;

--
-- Name: lending_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.lending_id_seq OWNED BY public.lending.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO admin;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO admin;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: password_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.password_history (
    id integer NOT NULL,
    user_id integer,
    password_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_history OWNER TO admin;

--
-- Name: password_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.password_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_history_id_seq OWNER TO admin;

--
-- Name: password_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.password_history_id_seq OWNED BY public.password_history.id;


--
-- Name: recipient_banks; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.recipient_banks (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.recipient_banks OWNER TO admin;

--
-- Name: recipient_banks_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.recipient_banks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recipient_banks_id_seq OWNER TO admin;

--
-- Name: recipient_banks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.recipient_banks_id_seq OWNED BY public.recipient_banks.id;


--
-- Name: savings_accounts; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.savings_accounts (
    id integer NOT NULL,
    bank_id integer,
    account_type_id integer,
    currency text,
    balance numeric(15,2) DEFAULT 0
);


ALTER TABLE public.savings_accounts OWNER TO admin;

--
-- Name: savings_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.savings_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.savings_accounts_id_seq OWNER TO admin;

--
-- Name: savings_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.savings_accounts_id_seq OWNED BY public.savings_accounts.id;


--
-- Name: system_backups; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.system_backups (
    id integer NOT NULL,
    version text NOT NULL,
    filename text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_backups OWNER TO admin;

--
-- Name: system_backups_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.system_backups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_backups_id_seq OWNER TO admin;

--
-- Name: system_backups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.system_backups_id_seq OWNED BY public.system_backups.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.system_settings (
    key text NOT NULL,
    value text
);


ALTER TABLE public.system_settings OWNER TO admin;

--
-- Name: transfers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.transfers (
    id integer NOT NULL,
    source_account_id integer,
    recipient text,
    recipient_bank_id integer,
    amount numeric(15,2),
    exchange_rate numeric(15,2),
    inr_amount numeric(15,2),
    method text,
    date date,
    status text DEFAULT 'ACTIVE'::text
);


ALTER TABLE public.transfers OWNER TO admin;

--
-- Name: transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transfers_id_seq OWNER TO admin;

--
-- Name: transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.transfers_id_seq OWNED BY public.transfers.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role text NOT NULL,
    mfa_secret text,
    mfa_enabled boolean DEFAULT false,
    reset_otp text,
    reset_otp_expires timestamp without time zone,
    password_changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO admin;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO admin;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: account_types id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.account_types ALTER COLUMN id SET DEFAULT nextval('public.account_types_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: banks id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.banks ALTER COLUMN id SET DEFAULT nextval('public.banks_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: credit_cards id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.credit_cards ALTER COLUMN id SET DEFAULT nextval('public.credit_cards_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: income id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.income ALTER COLUMN id SET DEFAULT nextval('public.income_id_seq'::regclass);


--
-- Name: investment_logs id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.investment_logs ALTER COLUMN id SET DEFAULT nextval('public.investment_logs_id_seq'::regclass);


--
-- Name: investments id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.investments ALTER COLUMN id SET DEFAULT nextval('public.investments_id_seq'::regclass);


--
-- Name: lending id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lending ALTER COLUMN id SET DEFAULT nextval('public.lending_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: password_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.password_history ALTER COLUMN id SET DEFAULT nextval('public.password_history_id_seq'::regclass);


--
-- Name: recipient_banks id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.recipient_banks ALTER COLUMN id SET DEFAULT nextval('public.recipient_banks_id_seq'::regclass);


--
-- Name: savings_accounts id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.savings_accounts ALTER COLUMN id SET DEFAULT nextval('public.savings_accounts_id_seq'::regclass);


--
-- Name: system_backups id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.system_backups ALTER COLUMN id SET DEFAULT nextval('public.system_backups_id_seq'::regclass);


--
-- Name: transfers id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.transfers ALTER COLUMN id SET DEFAULT nextval('public.transfers_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: account_types; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.account_types (id, name) FROM stdin;
1	Savings
2	Checking
3	Investment
\.


--
-- Data for Name: ai_monthly_insights; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.ai_monthly_insights (month, insights, generated_at) FROM stdin;
2026-02	\n1. Executive Summary\n   - You had a strong net cash flow of $3147.86 in 2026-02, maintaining your savings rate of 56.3%.\n   - Your total income was $5592.34, and total expenses were $2444.48, resulting in a significant savings of $3147.86.\n\n2. Specific Observations\n   - Rent costs remained stable at $1400, with no change.\n   - Your installment payments decreased by $331.48, reflecting better budgeting.\n   - Your insurance costs increased slightly, but it's still within a manageable range.\n\n3. Actionable Recommendation\n   - Continue monitoring your insurance costs and consider adjusting your spending if necessary to maintain a balanced budget.	2026-03-07 23:56:55.159174
2026-03	\n\n1. Executive Summary\n   - You experienced a net cash flow of -$681.22 in 2026-03, resulting in a savings rate of -50.7%. This indicates that your expenses exceeded your income.\n   - Your total expenses increased by 17.2% compared to last month, with the largest increase in insurance costs.\n\n2. Specific Observations\n   - Insurance costs surged by $295.59, representing a 249.2% increase.\n   - Personal care expenses increased by $160.85, a 100% increase.\n   - Grocery costs decreased by $28.28, a 36.1% reduction.\n\n3. Actionable Recommendation\n   - Consider reviewing your insurance policies to ensure they are still necessary and cost-effective. You might also explore budgeting strategies to reduce your insurance costs further.	2026-03-07 23:58:18.477653
2026-01	\n1. Executive Summary\n   - You had a strong net cash flow of $3176.68 in January 2026.\n   - Your savings rate was 55.6%, indicating good financial discipline.\n\n2. Specific Observations\n   - Rent increased by 1400% compared to last month.\n   - Installments increased by 994.44%.\n   - Insurance costs rose by 118.54%.\n   - Bank fees increased by 19.8%.\n\n3. Actionable Recommendation\n   - Review your rent and utility bills to identify areas for cost savings.	2026-03-07 23:59:13.971827
2025-12	\n1. Executive Summary\n   - You had no net cash flow in 2025-12.\n   - Your total income and expenses were both zero.\n\n2. Specific Observations\n   - There were no changes in your spending categories compared to the previous month.\n   - You have no active investments.\n\n3. Actionable Recommendation\n   - Consider setting a specific savings goal and automating your savings to build up your emergency fund.	2026-03-07 23:59:57.03182
2025-07	\n1. Executive Summary:\n   Your net cash flow remains at zero, indicating no savings or investments. Your total income and expenses are also zero, suggesting no financial activities in July 2025.\n\n2. Specific Observations:\n   - There are no changes in your spending categories compared to last month.\n   - You have no active investments.\n\n3. Actionable Recommendation:\n   - Consider setting up a basic budget to track your spending and savings. This will help you manage your finances more effectively.	2026-03-08 00:00:52.266419
2025-04	\n1. Executive Summary:\n   Your net cash flow remains at zero, indicating no savings or investments. Your total income and expenses are also zero, suggesting no financial activities in April 2025.\n\n2. Specific Observations:\n   - There are no changes in categories compared to last month.\n   - You have no active investments.\n\n3. Actionable Recommendation:\n   - Consider setting a specific savings goal for the month to build your financial foundation.	2026-03-08 00:01:35.478091
2024-12	\n1. Executive Summary\n   - You had a net cash flow of $0.00 in 2024-12, maintaining your savings rate of 0%.\n   - Your total income and expenses were both $0.00, indicating no financial activities.\n\n2. Specific Observations\n   - There were no significant changes in your spending categories compared to the previous month.\n   - You have no active investments.\n\n3. Actionable Recommendation\n   - Consider setting a specific savings goal and automating your savings to ensure you have a buffer for unexpected expenses.	2026-03-08 00:02:22.044818
2024-08	\n1. Executive Summary\n   - You had no net cash flow in August 2024.\n   - Your total income and expenses were both zero.\n\n2. Specific Observations\n   - There were no changes in your spending categories compared to last month.\n   - You have no active investments.\n\n3. Actionable Recommendation\n   - Consider setting up a basic budget to track your spending and save money.	2026-03-08 00:03:03.340006
2024-07	\n1. Executive Summary\n   - You had no net cash flow in July 2024.\n   - Your total income and expenses were both zero.\n\n2. Specific Observations\n   - There were no significant changes in your spending categories compared to last month.\n   - You have no active investments.\n\n3. Actionable Recommendation\n   - Consider setting up a basic budget to track your spending and ensure you have a buffer for emergencies.	2026-03-08 00:03:45.496827
2024-06	\n1. Executive Summary\n   - You had no net cash flow in June 2024.\n   - Your total income and expenses were both zero.\n\n2. Specific Observations\n   - There were no changes in your spending categories compared to last month.\n   - You have no active investments.\n\n3. Actionable Recommendation\n   - Consider setting up a basic budget to track your spending and save money.	2026-03-08 00:04:27.205186
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.audit_logs (id, action_details, "timestamp") FROM stdin;
1	User "Sagar" with role "admin" has logged in.	2026-03-07 21:57:58.141759
2	️ Security Update: Two-Factor Authentication (MFA) has been ENABLED for "undefined".	2026-03-07 21:58:21.435294
3	System config added: [banks] CIBC	2026-03-07 21:59:14.212217
4	System config added: [banks] TD	2026-03-07 21:59:18.160796
5	System config added: [banks] KOHO	2026-03-07 21:59:23.065623
6	System config added: [banks] WEALTHSIMPLE	2026-03-07 21:59:29.067801
7	Credit Card minted: PC FINANCIAL	2026-03-07 22:00:15.45073
8	Credit Card minted: TD	2026-03-07 22:00:27.009038
9	New Bank Account Added.	2026-03-07 22:01:32.46363
10	New Bank Account Added.	2026-03-07 22:01:46.369436
11	You have spent C$331.48 on Car Loan (Installment) from CIBC (Checking)	2026-03-07 22:03:20.834214
12	You received C$1344.00 from Empolyment Insurance into CIBC (Checking)	2026-03-07 22:03:54.395131
13	You have spent C$331.48 on Car Loan (Installment) from CIBC (Checking)	2026-03-07 22:04:28.730065
14	You have spent C$118.54 on Car Insurance (Insurance) from CIBC (Checking)	2026-03-07 22:05:05.017459
15	You received C$1344.00 from Employment Insurance into CIBC (Checking)	2026-03-07 22:05:26.19275
16	You have spent C$331.48 on Car Loan (Installment) from CIBC (Checking)	2026-03-07 22:05:57.080089
17	You received C$538.83 from Bluum Salary into CIBC (Checking)	2026-03-07 22:06:28.149458
18	You received C$1274.05 from Bluum Salary into CIBC (Checking)	2026-03-07 22:06:49.018569
19	You have spent C$331.48 on Car Loan (Installment) from CIBC (Checking)	2026-03-07 22:07:39.18569
20	You received C$1274.50 from Bluum Salary into CIBC (Checking)	2026-03-07 22:08:05.182514
21	You received C$1344.00 from Employment Insurance into CIBC (Checking)	2026-03-07 22:08:29.153258
22	You have spent C$118.62 on Car Insurance (Insurance) from CIBC (Checking)	2026-03-07 22:09:17.870441
23	You have spent C$331.48 on Car Loan (Installment) from CIBC (Checking)	2026-03-07 22:09:36.488878
24	You received C$1274.50 from Bluum Salary into CIBC (Checking)	2026-03-07 22:10:12.131463
25	System config added: [categories] Bank Fee	2026-03-07 22:10:29.343523
26	You have spent C$4.00 on CIBC (Bank Fee) from CIBC (Checking)	2026-03-07 22:11:01.066538
27	You have spent C$4.00 on CIBC (Bank Fee) from CIBC (Checking)	2026-03-07 22:11:21.542675
28	You have spent C$414.21 on Car Insurance (Insurance) from CIBC (Checking)	2026-03-07 22:12:14.059447
29	You received C$1344.00 from Employment Insurance into CIBC (Checking)	2026-03-07 22:12:41.538292
30	New Bank Account Added.	2026-03-07 22:14:36.966814
31	New Bank Account Added.	2026-03-07 22:14:43.74789
32	You have spent C$3.95 on TD (Bank Fee) from TD (Checking)	2026-03-07 22:15:11.984541
33	You received C$269.41 from Bluum Salary into TD (Checking)	2026-03-07 22:15:44.516935
34	You received C$637.03 from Bluum Salary into TD (Checking)	2026-03-07 22:15:59.95326
35	You have spent C$3.95 on TD (Bank Fee) from TD (Checking)	2026-03-07 22:16:22.678099
36	You received C$637.25 from Bluum Salary into TD (Checking)	2026-03-07 22:16:59.152748
37	You received C$637.25 from Bluum Salary into TD (Checking)	2026-03-07 22:17:20.664952
38	You have spent C$3.95 on TD (Bank Fee) from TD (Checking)	2026-03-07 22:17:52.664528
39	You have spent C$21.02 on CPR - Vidhi (Misc) from TD	2026-03-07 22:20:11.36254
40	You have spent C$119.76 on Vape (Misc) from TD	2026-03-07 22:20:43.99962
41	You have spent C$26.58 on Walmart (Grocery) from TD	2026-03-07 22:21:09.352685
42	You have spent C$160.85 on Repayment - Dentist (Personal Care) from TD	2026-03-07 22:21:48.018804
43	Investment Account Created: FHSA	2026-03-07 22:22:33.000048
44	You have spent C$1400.00 on Rent from CIBC (Checking)	2026-03-07 22:23:37.304624
45	You have spent C$1400.00 on Rent from CIBC (Checking)	2026-03-07 22:23:53.548975
46	You have spent C$1400.00 on Rent from CIBC (Checking)	2026-03-07 22:24:07.29501
47	New Bank Account Added.	2026-03-07 22:25:26.711183
48	New Bank Account Added.	2026-03-07 22:25:32.526316
49	You received C$106.17 from Bluum Salary into KOHO (Checking)	2026-03-07 22:25:57.461683
50	You received C$44.90 from Bluum Salary into KOHO (Checking)	2026-03-07 22:26:26.719215
51	You have spent C$3.90 on Tim Horton (Food) from KOHO (Checking)	2026-03-07 22:27:04.327945
52	You received C$106.21 from Bluum Salary into KOHO (Checking)	2026-03-07 22:27:35.557666
53	You received C$106.21 from Bluum Salary into KOHO (Checking)	2026-03-07 22:27:59.434864
54	You have spent C$3.78 on Walmart (Grocery) from KOHO (Checking)	2026-03-07 22:28:31.217068
55	You have spent C$19.34 on NoFrills (Grocery) from PC FINANCIAL	2026-03-07 22:32:39.445937
56	You have spent C$5.00 on Lottery (Misc) from PC FINANCIAL	2026-03-07 22:32:53.514761
57	You have spent C$43.66 on Food Basics (Grocery) from PC FINANCIAL	2026-03-07 22:33:18.998251
58	You have spent C$15.44 on NoFrills (Grocery) from PC FINANCIAL	2026-03-07 22:33:37.861091
59	You have spent C$22.88 on Shipping Parcel - Roshni (Misc) from PC FINANCIAL	2026-03-07 22:34:11.287039
60	You have spent C$8.57 on NoFrills (Grocery) from PC FINANCIAL	2026-03-07 22:34:40.100099
61	You have spent C$11.23 on NoFrills (Grocery) from PC FINANCIAL	2026-03-07 22:35:15.728146
62	Investment Account Created: TFSA	2026-03-07 22:36:41.761247
63	System config added: [banks] SUNLIFE	2026-03-07 22:37:00.093959
64	Investment Account Created: RRSP	2026-03-07 22:37:23.203817
65	Loan Issued.	2026-03-07 22:41:48.465988
66	Loan Issued.	2026-03-07 22:42:37.178342
67	Credit Card modified: ID 1	2026-03-07 22:44:11.270501
68	System config added: [banks] VIDHI - TD	2026-03-07 22:48:12.349629
69	New Bank Account Added.	2026-03-07 22:48:42.964865
70	New Bank Account Added.	2026-03-07 22:49:11.738079
71	You have spent C$3.95 on TD - Vidhi (Bank Fee) from VIDHI - TD (Checking)	2026-03-07 22:49:49.37398
72	You received C$44.90 from Bluum Salary into VIDHI - TD (Checking)	2026-03-07 22:50:14.185577
73	You received C$106.17 from Bluum Salary into VIDHI - TD (Checking)	2026-03-07 22:50:30.453579
74	You have spent C$3.95 on TD - Vidhi (Bank Fee) from VIDHI - TD (Checking)	2026-03-07 22:50:53.455457
75	You received C$106.21 from Bluum Salary into VIDHI - TD (Checking)	2026-03-07 22:51:15.633107
76	You received C$106.21 from Bluum Salary into VIDHI - TD (Checking)	2026-03-07 22:51:34.243946
77	You have spent C$3.95 on TD - Vidhi (Bank Fee) from VIDHI - TD (Checking)	2026-03-07 22:52:10.585388
78	User "Sagar" with role "admin" has logged in.	2026-03-07 23:02:59.732111
79	System config added: [recipient_banks] SBI BANK	2026-03-07 23:10:15.259794
80	System config added: [recipient_banks] CENTRAL BANK	2026-03-07 23:10:20.819958
81	System config added: [recipient_banks] AXIS BANK	2026-03-07 23:10:26.342243
82	System config added: [recipient_banks] UNION BANK	2026-03-07 23:10:33.051281
83	System config added: [recipient_banks] HDFC	2026-03-07 23:10:40.916424
84	Transfer Logged.	2026-03-07 23:15:41.380435
85	Transfer Logged.	2026-03-07 23:16:48.641725
86	Transfer Logged.	2026-03-07 23:17:39.830303
87	Transfer Logged.	2026-03-07 23:18:51.438898
88	Transfer Logged.	2026-03-07 23:20:05.808385
89	Transfer Logged.	2026-03-07 23:20:48.20342
90	Transfer Logged.	2026-03-07 23:22:25.485603
91	Transfer Logged.	2026-03-07 23:23:28.468366
92	Transfer Logged.	2026-03-07 23:24:09.237592
93	User "Sagar" with role "admin" has logged in.	2026-03-07 23:56:13.127304
94	*Manual AI Analysis Complete*\n\nVittaparāmarśadātā has successfully analyzed the report for 2026-03.	2026-03-07 23:58:18.48337
95	*Historical Backfill Complete*\n\nVittaparāmarśadātā has successfully analyzed and generated reports for 9 past month(s). Log in to download your official PDF reports!	2026-03-08 00:04:37.216075
96	User "Sagar" with role "admin" has logged in.	2026-03-08 13:08:36.578015
97	Backup process started. Version: v20260308171347. Type: Manual	2026-03-08 13:13:47.478711
98	Backup process completed successfully. Version: v20260308171347	2026-03-08 13:13:47.674333
99	System Backup Successful [v20260308171347]\nNotes: Updated all transaction will 7th March	2026-03-08 13:13:47.678392
100	User "Sagar" with role "admin" has logged in.	2026-03-08 13:43:18.028859
101	User "Sagar" with role "admin" has logged in.	2026-03-08 15:21:50.415441
102	User "Sagar" with role "admin" has logged in.	2026-03-08 19:54:08.002543
103	Credit Card Repaid: C$330 to TD	2026-03-08 19:57:14.04402
104	Backup schedule updated: weekly at 01:00	2026-03-08 19:58:44.999393
105	Backup process started. Version: v20260309050000. Type: Automated	2026-03-09 01:00:00.615879
\.


--
-- Data for Name: banks; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.banks (id, name) FROM stdin;
1	CIBC
2	TD
3	KOHO
4	WEALTHSIMPLE
5	SUNLIFE
6	VIDHI - TD
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.categories (id, name) FROM stdin;
1	Rent
2	Utility
3	Installment
4	Insurance
5	Mobile Bill
6	Gas
7	Grocery
8	Food
9	Shopping
10	Charging
11	Personal Care
12	Household
13	Misc
14	Bank Fee
\.


--
-- Data for Name: credit_cards; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.credit_cards (id, name, limit_amount, balance) FROM stdin;
1	PC	1500.00	126.12
2	TD	7600.00	-1.79
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.expenses (id, amount, category_id, account_id, credit_card_id, description, date, status) FROM stdin;
1	331.48	3	1	\N	Car Loan	2026-01-02	ACTIVE
2	331.48	3	1	\N	Car Loan	2026-01-15	ACTIVE
3	118.54	4	1	\N	Car Insurance	2026-01-22	ACTIVE
4	331.48	3	1	\N	Car Loan	2026-01-29	ACTIVE
5	331.48	3	1	\N	Car Loan	2026-02-12	ACTIVE
6	118.62	4	1	\N	Car Insurance	2026-02-23	ACTIVE
7	331.48	3	1	\N	Car Loan	2026-02-26	ACTIVE
8	4.00	14	1	\N	CIBC	2026-02-27	ACTIVE
9	4.00	14	1	\N	CIBC	2026-01-30	ACTIVE
10	414.21	4	1	\N	Car Insurance	2026-03-04	ACTIVE
11	3.95	14	3	\N	TD	2026-01-01	ACTIVE
12	3.95	14	3	\N	TD	2026-01-31	ACTIVE
13	3.95	14	3	\N	TD	2026-02-28	ACTIVE
14	21.02	13	\N	2	CPR - Vidhi	2026-02-20	ACTIVE
15	119.76	13	\N	2	Vape	2026-02-26	ACTIVE
16	26.58	7	\N	2	Walmart	2026-03-01	ACTIVE
17	160.85	11	\N	2	Repayment - Dentist	2026-03-07	ACTIVE
18	1400.00	1	1	\N		2026-01-01	ACTIVE
19	1400.00	1	1	\N		2026-02-01	ACTIVE
20	1400.00	1	1	\N		2026-03-01	ACTIVE
21	3.90	8	5	\N	Tim Horton	2026-02-06	ACTIVE
22	3.78	7	5	\N	Walmart	2026-03-04	ACTIVE
23	19.34	7	\N	1	NoFrills	2026-02-06	ACTIVE
24	5.00	13	\N	1	Lottery	2026-02-14	ACTIVE
25	43.66	7	\N	1	Food Basics	2026-02-15	ACTIVE
26	15.44	7	\N	1	NoFrills	2026-02-15	ACTIVE
27	22.88	13	\N	1	Shipping Parcel - Roshni	2026-02-15	ACTIVE
28	8.57	7	\N	1	NoFrills	2026-03-01	ACTIVE
29	11.23	7	\N	1	NoFrills	2026-03-06	ACTIVE
30	3.95	14	7	\N	TD - Vidhi	2026-01-01	ACTIVE
31	3.95	14	7	\N	TD - Vidhi	2026-01-31	ACTIVE
32	3.95	14	7	\N	TD - Vidhi	2026-02-28	ACTIVE
\.


--
-- Data for Name: income; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.income (id, source, amount, account_id, date, status) FROM stdin;
1	Empolyment Insurance	1344.00	1	2026-01-14	ACTIVE
2	Employment Insurance	1344.00	1	2026-01-28	ACTIVE
3	Bluum Salary	538.83	1	2026-01-30	ACTIVE
4	Bluum Salary	1274.05	1	2026-01-30	ACTIVE
5	Bluum Salary	1274.50	1	2026-02-13	ACTIVE
6	Employment Insurance	1344.00	1	2026-02-17	ACTIVE
7	Bluum Salary	1274.50	1	2026-02-27	ACTIVE
8	Employment Insurance	1344.00	1	2026-03-04	ACTIVE
9	Bluum Salary	269.41	3	2026-01-30	ACTIVE
10	Bluum Salary	637.03	3	2026-01-30	ACTIVE
11	Bluum Salary	637.25	3	2026-02-13	ACTIVE
12	Bluum Salary	637.25	3	2026-02-27	ACTIVE
13	Bluum Salary	106.17	5	2026-01-29	ACTIVE
14	Bluum Salary	44.90	5	2026-01-29	ACTIVE
15	Bluum Salary	106.21	5	2026-02-12	ACTIVE
16	Bluum Salary	106.21	5	2026-02-26	ACTIVE
17	Bluum Salary	44.90	7	2026-01-30	ACTIVE
18	Bluum Salary	106.17	7	2026-01-30	ACTIVE
19	Bluum Salary	106.21	7	2026-02-13	ACTIVE
20	Bluum Salary	106.21	7	2026-02-27	ACTIVE
\.


--
-- Data for Name: investment_logs; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.investment_logs (id, investment_id, date, balance, net_contribution, status) FROM stdin;
1	1	2026-03-08	10739.06	10739.06	ACTIVE
2	2	2026-03-08	250.00	250.00	ACTIVE
3	3	2026-03-08	3820.78	3820.78	ACTIVE
\.


--
-- Data for Name: investments; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.investments (id, name, bank_id, type, status, account_type_id) FROM stdin;
1	FHSA	2	Stock	ACTIVE	3
2	TFSA	4	Stock	ACTIVE	3
3	RRSP	5	Stock	ACTIVE	3
\.


--
-- Data for Name: lending; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.lending (id, source_account_id, recipient, recipient_bank_id, amount, repaid, method, date, status) FROM stdin;
1	1	Rahul Sonegi	\N	700.00	0.00	E-Transfer	2026-03-08	ACTIVE
2	3	Rahul Gupta	\N	4975.26	0.00	Wire	2026-03-08	ACTIVE
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.notifications (id, message, is_read, created_at) FROM stdin;
86	Credit Card Repaid: C$330 to TD	f	2026-03-08 19:57:14.039965
\.


--
-- Data for Name: password_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.password_history (id, user_id, password_hash, created_at) FROM stdin;
\.


--
-- Data for Name: recipient_banks; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.recipient_banks (id, name) FROM stdin;
1	SBI BANK
2	CENTRAL BANK
3	AXIS BANK
4	UNION BANK
5	HDFC
\.


--
-- Data for Name: savings_accounts; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.savings_accounts (id, bank_id, account_type_id, currency, balance) FROM stdin;
2	1	1	CAD	10567.29
1	1	2	CAD	1273.86
7	6	2	CAD	462.35
3	2	2	CAD	171.99
4	2	1	CAD	4010.02
5	3	2	CAD	359.41
6	3	1	CAD	205.65
8	6	1	CAD	11030.25
\.


--
-- Data for Name: system_backups; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.system_backups (id, version, filename, notes, created_at) FROM stdin;
1	v20260308171347	vault_backup_v20260308171347.sql	Updated all transaction will 7th March	2026-03-08 13:13:47.671835
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.system_settings (key, value) FROM stdin;
JWT_SECRET	fc887df27f2174e3fadf02d84ffb2fde11b5d1ef6152ada06c5c573d82beb87f02f69cac11a8efea0e7082fecaf889d6703b8bd2155862ff59a247b3f4866716
TELEGRAM_BOT_TOKEN	8691165072:AAH8M24SBVH3cVOKch4qSUFeVn3h_WrZ1CI
TELEGRAM_CHAT_ID	944587722
NGROK_TOKEN	39VW4wwl04BnLKzqTz6VjyyhauN_JTHWrq736X1FK8EhbTRP
BACKUP_FREQ	weekly
BACKUP_TIME	01:00
BACKUP_DAY	1
\.


--
-- Data for Name: transfers; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.transfers (id, source_account_id, recipient, recipient_bank_id, amount, exchange_rate, inr_amount, method, date, status) FROM stdin;
1	1	Papa	2	14000.00	60.81	851340.00	Remitly/Wise	2024-06-25	ACTIVE
2	1	Papa	3	14000.00	60.93	853020.00	Remitly/Wise	2024-07-06	ACTIVE
3	\N	Papa	4	10000.00	61.00	610000.00	Cash	2024-07-22	ACTIVE
4	\N	Papa	1	3310.00	60.42	199990.20	Cash	2024-08-05	ACTIVE
5	1	Papa	1	3353.46	59.64	200000.35	Remitly/Wise	2024-12-11	ACTIVE
6	1	Papa	4	10000.00	61.87	618700.00	Remitly/Wise	2025-04-12	ACTIVE
7	\N	Papa	5	10000.00	62.27	622700.00	Cash	2025-07-17	ACTIVE
8	1	Papa	3	6000.00	63.75	382500.00	Remitly/Wise	2025-12-01	ACTIVE
9	7	Papa	1	5000.00	63.71	318550.00	Remitly/Wise	2025-12-03	ACTIVE
10	3	CC: TD	\N	330.00	1.00	330.00	Credit Card Repayment	2026-03-08	ACTIVE
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.users (id, username, password, role, mfa_secret, mfa_enabled, reset_otp, reset_otp_expires, password_changed_at) FROM stdin;
1	Sagar	$2a$10$6965m8o3gIJ8lSSlPFeoQuhwsu5Kl13WZh7ewCBnQmaxpL2/hZbhO	admin	AQ6DI5KVABPE2CAX	t	\N	\N	2026-03-07 21:57:50.793946
\.


--
-- Name: account_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.account_types_id_seq', 3, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 105, true);


--
-- Name: banks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.banks_id_seq', 6, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.categories_id_seq', 14, true);


--
-- Name: credit_cards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.credit_cards_id_seq', 2, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.expenses_id_seq', 32, true);


--
-- Name: income_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.income_id_seq', 20, true);


--
-- Name: investment_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.investment_logs_id_seq', 3, true);


--
-- Name: investments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.investments_id_seq', 3, true);


--
-- Name: lending_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.lending_id_seq', 2, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.notifications_id_seq', 86, true);


--
-- Name: password_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.password_history_id_seq', 1, false);


--
-- Name: recipient_banks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.recipient_banks_id_seq', 5, true);


--
-- Name: savings_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.savings_accounts_id_seq', 8, true);


--
-- Name: system_backups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.system_backups_id_seq', 1, true);


--
-- Name: transfers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.transfers_id_seq', 10, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: account_types account_types_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.account_types
    ADD CONSTRAINT account_types_pkey PRIMARY KEY (id);


--
-- Name: ai_monthly_insights ai_monthly_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.ai_monthly_insights
    ADD CONSTRAINT ai_monthly_insights_pkey PRIMARY KEY (month);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: banks banks_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: credit_cards credit_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.credit_cards
    ADD CONSTRAINT credit_cards_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: income income_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.income
    ADD CONSTRAINT income_pkey PRIMARY KEY (id);


--
-- Name: investment_logs investment_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.investment_logs
    ADD CONSTRAINT investment_logs_pkey PRIMARY KEY (id);


--
-- Name: investments investments_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT investments_pkey PRIMARY KEY (id);


--
-- Name: lending lending_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lending
    ADD CONSTRAINT lending_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_history password_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_pkey PRIMARY KEY (id);


--
-- Name: recipient_banks recipient_banks_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.recipient_banks
    ADD CONSTRAINT recipient_banks_pkey PRIMARY KEY (id);


--
-- Name: savings_accounts savings_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.savings_accounts
    ADD CONSTRAINT savings_accounts_pkey PRIMARY KEY (id);


--
-- Name: system_backups system_backups_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.system_backups
    ADD CONSTRAINT system_backups_pkey PRIMARY KEY (id);


--
-- Name: system_backups system_backups_version_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.system_backups
    ADD CONSTRAINT system_backups_version_key UNIQUE (version);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: transfers transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: expenses expenses_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.savings_accounts(id);


--
-- Name: expenses expenses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: expenses expenses_credit_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_credit_card_id_fkey FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(id);


--
-- Name: income income_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.income
    ADD CONSTRAINT income_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.savings_accounts(id);


--
-- Name: investment_logs investment_logs_investment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.investment_logs
    ADD CONSTRAINT investment_logs_investment_id_fkey FOREIGN KEY (investment_id) REFERENCES public.investments(id);


--
-- Name: investments investments_account_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT investments_account_type_id_fkey FOREIGN KEY (account_type_id) REFERENCES public.account_types(id);


--
-- Name: investments investments_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT investments_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.banks(id);


--
-- Name: lending lending_recipient_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lending
    ADD CONSTRAINT lending_recipient_bank_id_fkey FOREIGN KEY (recipient_bank_id) REFERENCES public.recipient_banks(id);


--
-- Name: lending lending_source_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.lending
    ADD CONSTRAINT lending_source_account_id_fkey FOREIGN KEY (source_account_id) REFERENCES public.savings_accounts(id);


--
-- Name: password_history password_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: savings_accounts savings_accounts_account_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.savings_accounts
    ADD CONSTRAINT savings_accounts_account_type_id_fkey FOREIGN KEY (account_type_id) REFERENCES public.account_types(id);


--
-- Name: savings_accounts savings_accounts_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.savings_accounts
    ADD CONSTRAINT savings_accounts_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.banks(id);


--
-- Name: transfers transfers_recipient_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_recipient_bank_id_fkey FOREIGN KEY (recipient_bank_id) REFERENCES public.recipient_banks(id);


--
-- Name: transfers transfers_source_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_source_account_id_fkey FOREIGN KEY (source_account_id) REFERENCES public.savings_accounts(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: admin
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict vxjbiaBFXEyBouQ4Vqvy9XLBMpBrxn6QUkomEAkjhDhwAjxt8uz4yyJXbE9CNeX

