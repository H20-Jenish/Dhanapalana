/**
 * Dhanapālana AI Training Dataset Generator
 * Generates synthetic training data for fine-tuning the financial AI assistant
 * Creates JSONL format dataset with natural language queries and corresponding SQL responses
 * Author: Dhanapālana Development Team
 * Purpose: Train AI model to understand financial queries and generate appropriate database queries
 */

const fs = require('fs');

// System prompt that defines the AI's role and database schema knowledge
// This prompt is used for all training examples to ensure consistency
const SYSTEM_PROMPT = `You are Vault, a strict PostgreSQL Database Agent.

TIME CONTEXT:
- Today's date: 2026-03-05
- "This month": 2026-03-01 to 2026-03-05
- "Last month": 2026-02-01 to 2026-02-28
- Historical data exists. Always query requested dates exactly.

SCHEMA:
- expenses (id, amount, description, date, category_id, account_id, credit_card_id)
- income (id, source, amount, account_id, date)
- categories (id, name)
- credit_cards (id, name, limit_amount, balance)
- savings_accounts (id, bank_id, currency, balance)
- transfers (id, source_account_id, recipient, amount, date)
- investments (id, name, type)
- investment_logs (id, investment_id, date, balance, net_contribution)

STRICT SQL RULES:
1. MATCH COLUMNS: 'expenses' and 'income' use 'amount'. 'savings_accounts' and 'credit_cards' use 'balance'.
2. NO DATES ON BALANCES: 'savings_accounts' and 'credit_cards' have NO date column.
3. GLOBAL TOTALS: If the user asks for "total spending across all categories" or "total income", DO NOT use GROUP BY. Write exactly -> SELECT COALESCE(SUM(amount), 0) FROM [table] WHERE [date_condition].
4. SPECIFIC SEARCHES: Use ILIKE '%keyword%' for text searches.
5. MANDATORY TOOL USE: You must execute the queryDatabase tool before responding. Do not explain your steps.`;

// Array to store all training question-SQL pairs
const trainingPairs = [];

// ===========================================
// TRAINING DATA GENERATORS
// ===========================================

// --- GENERATOR 1: Global Totals (Income & Expenses) ---
// Creates training examples for total spending/income queries across different timeframes
const timeframes = [
  { phrase: "last month", sql: "date >= '2026-02-01' AND date <= '2026-02-28'" },
  { phrase: "this month", sql: "date >= '2026-03-01' AND date <= '2026-03-05'" },
  { phrase: "in January 2024", sql: "date >= '2024-01-01' AND date <= '2024-01-31'" },
  { phrase: "in 2023", sql: "date >= '2023-01-01' AND date <= '2023-12-31'" },
  { phrase: "last year", sql: "date >= '2025-01-01' AND date <= '2025-12-31'" }
];

// Generate total spending and income queries for each timeframe
timeframes.forEach(t => {
  trainingPairs.push([`What was my total spending across all categories ${t.phrase}?`, `SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE ${t.sql}`]);
  trainingPairs.push([`How much total money did I spend ${t.phrase}?`, `SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE ${t.sql}`]);
  trainingPairs.push([`How much total income did I make ${t.phrase}?`, `SELECT COALESCE(SUM(amount), 0) FROM income WHERE ${t.sql}`]);
  trainingPairs.push([`What was my total inflow ${t.phrase}?`, `SELECT COALESCE(SUM(amount), 0) FROM income WHERE ${t.sql}`]);
});

// --- GENERATOR 2: Category Spending (Database JOINs) ---
// Creates examples requiring JOIN operations between expenses and categories tables
const categories = ['groceries', 'rent', 'dining', 'utilities', 'entertainment', 'gas', 'shopping', 'insurance'];
categories.forEach(cat => {
  timeframes.forEach(t => {
    trainingPairs.push([`How much did I spend on ${cat} ${t.phrase}?`, `SELECT COALESCE(SUM(e.amount), 0) FROM expenses e JOIN categories c ON e.category_id = c.id WHERE c.name ILIKE '%${cat}%' AND e.${t.sql}`]);
    trainingPairs.push([`What were my ${cat} costs ${t.phrase}?`, `SELECT COALESCE(SUM(e.amount), 0) FROM expenses e JOIN categories c ON e.category_id = c.id WHERE c.name ILIKE '%${cat}%' AND e.${t.sql}`]);
  });
});

// --- GENERATOR 3: Specific Merchants (Text Search with ILIKE) ---
// Creates examples for searching expenses by merchant/description
const merchants = ['Walmart', 'Amazon', 'Uber', 'Netflix', 'Starbucks', 'Apple', 'Home Depot'];
merchants.forEach(merch => {
  timeframes.forEach(t => {
    trainingPairs.push([`How much did I pay to ${merch} ${t.phrase}?`, `SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE description ILIKE '%${merch}%' AND ${t.sql}`]);
    trainingPairs.push([`Show me my transactions at ${merch} ${t.phrase}.`, `SELECT description, amount, date FROM expenses WHERE description ILIKE '%${merch}%' AND ${t.sql} ORDER BY date DESC`]);
  });
});

// --- GENERATOR 4: Live Balances (NO Date Constraints) ---
// Creates examples for current account balances (no date filtering allowed)
const balanceQueries = [
  ["What is the total combined balance of all my savings accounts right now?", "SELECT COALESCE(SUM(balance), 0) FROM savings_accounts"],
  ["How much cash do I have in savings?", "SELECT COALESCE(SUM(balance), 0) FROM savings_accounts"],
  ["How much debt do I currently have across all my credit cards?", "SELECT COALESCE(SUM(balance), 0) FROM credit_cards"],
  ["What is my current total credit card limit?", "SELECT COALESCE(SUM(limit_amount), 0) FROM credit_cards"],
  ["Show me the balances of all my credit cards.", "SELECT name, balance FROM credit_cards ORDER BY balance DESC"],
  ["List all my savings accounts and their balances.", "SELECT bank_id, currency, balance FROM savings_accounts ORDER BY balance DESC"]
];
balanceQueries.forEach(bq => trainingPairs.push(bq));

// --- GENERATOR 5: Top Lists & Extremes (ORDER BY with LIMIT) ---
// Creates examples for finding largest/smallest transactions and recent activity
const limitQueries = [
  ["What was my single largest expense last month?", "SELECT description, amount FROM expenses WHERE date >= '2026-02-01' AND date <= '2026-02-28' ORDER BY amount DESC LIMIT 1"],
  ["What were my top 3 biggest expenses in 2023?", "SELECT description, amount FROM expenses WHERE date >= '2023-01-01' AND date <= '2023-12-31' ORDER BY amount DESC LIMIT 3"],
  ["Show me my 5 most recent income deposits.", "SELECT source, amount, date FROM income ORDER BY date DESC LIMIT 5"],
  ["What are my 2 highest credit card balances?", "SELECT name, balance FROM credit_cards ORDER BY balance DESC LIMIT 2"],
  ["What was the most expensive thing I bought in January 2024?", "SELECT description, amount FROM expenses WHERE date >= '2024-01-01' AND date <= '2024-01-31' ORDER BY amount DESC LIMIT 1"],
  ["List my 10 most recent expenses.", "SELECT description, amount, date FROM expenses ORDER BY date DESC LIMIT 10"]
];
limitQueries.forEach(lq => trainingPairs.push(lq));

// --- GENERATOR 6: Investments & Transfers (Complex Queries) ---
// Creates examples for investment tracking and money transfers
const complexQueries = [
  ["How much did I transfer to Alice last year?", "SELECT COALESCE(SUM(amount), 0) FROM transfers WHERE recipient ILIKE '%Alice%' AND date >= '2025-01-01' AND date <= '2025-12-31'"],
  ["Show me my recent investment logs.", "SELECT date, balance, net_contribution FROM investment_logs ORDER BY date DESC LIMIT 5"],
  ["How much net contribution did I make to my investments this month?", "SELECT COALESCE(SUM(net_contribution), 0) FROM investment_logs WHERE date >= '2026-03-01' AND date <= '2026-03-05'"]
];
complexQueries.forEach(cq => trainingPairs.push(cq));

// ===========================================
// OUTPUT FORMATTING FUNCTIONS
// ===========================================

// Helper function to format the AI's expected tool-calling response
// This creates the exact JSON structure the AI should output for function calls
const createToolCall = (sqlQuery) => {
  return `I will query the database to find this information.\n\n\`\`\`json\n{\n  "type": "function",\n  "name": "queryDatabase",\n  "arguments": {\n    "sql": "${sqlQuery}"\n  }\n}\n\`\`\``;
};

// ===========================================
// DATASET GENERATION
// ===========================================

// Generate the JSONL format required for AI training
let jsonlContent = "";

// Shuffle the training pairs to prevent the AI from learning patterns based on order
const shuffledPairs = trainingPairs.sort(() => Math.random() - 0.5);

// Convert each question-SQL pair into the JSONL conversation format
shuffledPairs.forEach(pair => {
  const [userQuery, sqlQuery] = pair;

  // Create conversation format with system prompt, user query, and AI tool call response
  const conversation = {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userQuery },
      { role: "assistant", content: createToolCall(sqlQuery) }
    ]
  };

  // Append to JSONL content (one JSON object per line)
  jsonlContent += JSON.stringify(conversation) + "\n";
});

// Write the generated dataset to file
fs.writeFileSync('vault_dataset.jsonl', jsonlContent.trim());
console.log(`✅ Successfully generated 'vault_dataset.jsonl' with ${shuffledPairs.length} unique training examples!`);