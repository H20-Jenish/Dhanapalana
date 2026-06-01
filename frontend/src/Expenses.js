/**
 * Dhanapālana - Expense Tracking Component
 * Expenses.js - Expense Entry, Categorization, and Management
 *
 * This component provides comprehensive expense tracking with multi-level categorization,
 * flexible payment method selection (bank account or credit card), and detailed transaction
 * logging for complete financial visibility.
 *
 * KEY FEATURES:
 * - Create and manage expense transactions
 * - Categorize expenses for budget tracking
 * - Flexible payment sources (bank account or credit card)
 * - Date and description logging
 * - Soft delete capability for data preservation
 * - Real-time expense statistics
 * - Modal-based form interface
 * - Category and account dropdown selectors
 *
 * EXPENSE DATA STRUCTURE:
 * - amount: Transaction amount (decimal)
 * - category_id: Foreign key to expense category
 * - description: Optional detailed description
 * - date: Transaction date in ISO format
 * - account_id: Linked bank account (if paid from account)
 * - credit_card_id: Linked credit card (if paid via credit)
 * - status: Soft delete flag (ACTIVE or DELETED)
 *
 * API ENDPOINTS:
 * - GET /api/expenses - All expense records
 * - POST /api/expenses - Create new expense
 * - PUT /api/expenses/:id - Update expense
 * - DELETE /api/expenses/:id - Soft delete expense
 * - GET /api/categories - Expense categories
 * - GET /api/savings - Bank accounts
 * - GET /api/credit-cards - Credit cards
 *
 * PAYMENT METHOD LOGIC:
 * - Two payment source types: account and credit
 * - Radio button selection for payment method
 * - Appropriate dropdown population based on method
 * - Default to account payment method
 *
 * VALIDATION:
 * - Amount must be positive
 * - Category is required
 * - Date defaults to today
 * - Payment source must be specified
 *
 * CATEGORIZATION BENEFITS:
 * - Budget tracking by category
 * - Spending pattern analysis
 * - Financial reporting and insights
 * - Category-based filtering
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { showConfirm } from './dialogService';

const getAccountTextColor = (label) => {
  const palette = ['#93c5fd', '#6ee7b7', '#fcd34d', '#c4b5fd', '#f9a8d4', '#67e8f9', '#bef264', '#fda4af'];
  const key = String(label || '');
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  if (key.startsWith('CC:')) return '#fda4af';
  return palette[Math.abs(hash) % palette.length];
};

/**
 * MODALWRAPPER COMPONENT
 * Reusable modal dialog for form entry
 * Features consistent modal styling across the application
 *
 * @param {string} title - Modal header title
 * @param {Function} onClose - Close button callback
 * @param {ReactNode} children - Modal content
 */
const ModalWrapper = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
    <div className="glass-card" style={{ width: '100%', maxWidth: '550px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(150,150,150,0.1)' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', opacity: 0.6 }}>✕</button>
      </div>
      <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
        {children}
      </div>
    </div>
  </div>
);

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [paymentSource, setPaymentSource] = useState('account');
  const [accountId, setAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');

  const API_URL = '/api';

  const getMonthKey = (value) => {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return 'unknown';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const getMonthLabel = (value) => {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return 'Unknown Month';
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getMonthStripStyle = (value) => {
    const palette = [
      { bg: 'rgba(239, 68, 68, 0.14)', text: '#f87171', border: 'rgba(248, 113, 113, 0.25)' },
      { bg: 'rgba(249, 115, 22, 0.14)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.25)' },
      { bg: 'rgba(245, 158, 11, 0.14)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.25)' },
      { bg: 'rgba(234, 179, 8, 0.14)', text: '#facc15', border: 'rgba(250, 204, 21, 0.25)' },
      { bg: 'rgba(132, 204, 22, 0.14)', text: '#a3e635', border: 'rgba(163, 230, 53, 0.25)' },
      { bg: 'rgba(16, 185, 129, 0.14)', text: '#34d399', border: 'rgba(52, 211, 153, 0.25)' },
      { bg: 'rgba(20, 184, 166, 0.14)', text: '#2dd4bf', border: 'rgba(45, 212, 191, 0.25)' },
      { bg: 'rgba(14, 165, 233, 0.14)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.25)' },
      { bg: 'rgba(59, 130, 246, 0.14)', text: '#60a5fa', border: 'rgba(96, 165, 250, 0.25)' },
      { bg: 'rgba(99, 102, 241, 0.14)', text: '#818cf8', border: 'rgba(129, 140, 248, 0.25)' },
      { bg: 'rgba(168, 85, 247, 0.14)', text: '#c084fc', border: 'rgba(192, 132, 252, 0.25)' },
      { bg: 'rgba(217, 70, 239, 0.14)', text: '#e879f9', border: 'rgba(232, 121, 249, 0.25)' }
    ];
    const key = getMonthKey(value);
    const idx = key === 'unknown' ? 0 : Math.max(0, (parseInt(key.slice(5, 7), 10) || 1) - 1);
    return palette[idx % palette.length];
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setExpenses((await axios.get(`${API_URL}/expenses`)).data.filter(e => e.status !== 'DELETED'));
      setCategories((await axios.get(`${API_URL}/categories`)).data);
      setAccounts((await axios.get(`${API_URL}/savings`)).data);
      setCreditCards((await axios.get(`${API_URL}/credit-cards`)).data);
    } catch (err) { console.error("Error fetching data"); }
  };

  const normalize = (value) => String(value || '').trim().toLowerCase();

  const expenseSuggestions = (() => {
    const seen = new Set();
    const push = (value, label = value) => {
      const key = normalize(value);
      if (!key || seen.has(key)) return null;
      seen.add(key);
      return { value, label };
    };

    const suggestions = [];
    expenses.forEach((item) => {
      suggestions.push(
        push(item.category, `Category: ${item.category}`),
        push(item.description, item.description ? `Description: ${item.description}` : ''),
        push(item.bank_name ? `${item.bank_name}${item.account_type ? ` ${item.account_type}` : ''}` : '', item.bank_name ? `Account: ${item.bank_name}${item.account_type ? ` ${item.account_type}` : ''}` : ''),
        push(item.credit_card_name ? `CC: ${item.credit_card_name}` : '', item.credit_card_name ? `Credit Card: ${item.credit_card_name}` : '')
      );
    });

    categories.forEach((cat) => suggestions.push(push(cat.name, `Category: ${cat.name}`)));
    accounts.forEach((acc) => suggestions.push(push(`${acc.bank_name}${acc.account_type ? ` ${acc.account_type}` : ''}`, `Account: ${acc.bank_name}${acc.account_type ? ` ${acc.account_type}` : ''}`)));
    creditCards.forEach((cc) => suggestions.push(push(cc.name, `Credit Card: ${cc.name}`)));

    return suggestions.filter(Boolean);
  })();

  const filteredExpenses = expenses.filter((item) => {
    const q = normalize(searchTerm);
    if (!q) return true;

    const accountLabel = `${item.bank_name || ''} ${item.account_type || ''}`.trim();
    const ccLabel = item.credit_card_name || '';
    return [item.category, item.description, item.amount, item.date, accountLabel, ccLabel]
      .filter(Boolean)
      .some((field) => normalize(field).includes(q));
  });

  const openModal = (item = null) => {
    if (item) {
      setEditingId(item.id); setAmount(item.amount); setCategoryId(item.category_id || '');
      setDescription(item.description || ''); setDate(item.date ? item.date.split('T')[0] : '');
      if (item.credit_card_id) { setPaymentSource('credit'); setCreditCardId(item.credit_card_id); setAccountId(''); } 
      else { setPaymentSource('account'); setAccountId(item.account_id || ''); setCreditCardId(''); }
    } else {
      setEditingId(null); setAmount(''); setCategoryId(''); setDescription(''); setDate(new Date().toISOString().split('T')[0]);
      setPaymentSource('account'); setAccountId(''); setCreditCardId('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryId) return alert("Category is required.");
    const payload = { amount: parseFloat(amount), category_id: categoryId, description, date: date || null, account_id: paymentSource === 'account' ? (accountId || null) : null, credit_card_id: paymentSource === 'credit' ? (creditCardId || null) : null };
    try {
      if (editingId) await axios.put(`${API_URL}/expenses/${editingId}`, payload);
      else await axios.post(`${API_URL}/expenses`, payload);
      setIsModalOpen(false); fetchData();
    } catch (err) { alert("Error saving expense."); }
  };

  const handleDelete = async (id) => {
    if (!(await showConfirm("Permanently delete this expense? Funds will be reverted.", { title: 'Delete Expense Record' }))) return;
    try { await axios.delete(`${API_URL}/expenses/${id}`); fetchData(); } 
    catch (err) { alert("Error deleting record."); }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(300px, 1fr) auto', alignItems: 'end', marginBottom: '32px', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: 800, letterSpacing: '-0.5px' }}>Expense Ledger</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: '15px' }}>Monitor your outbound cash flows and categorized spending.</p>
        </div>
        <div style={{ position: 'relative', minWidth: 0, alignSelf: 'stretch', display: 'flex', alignItems: 'end' }}>
          <div style={{ width: '100%', position: 'relative' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search category, description, account, credit card..."
              className="glass-input"
              style={{ width: '100%', padding: '12px 14px' }}
            />
            {searchTerm.trim() && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 20, background: 'rgba(10,10,10,0.98)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', boxShadow: '0 16px 40px rgba(0,0,0,0.35)', padding: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>Suggestions</div>
                {expenseSuggestions.filter((item) => normalize(item.label).includes(normalize(searchTerm))).slice(0, 10).length > 0 ? (
                  expenseSuggestions.filter((item) => normalize(item.label).includes(normalize(searchTerm))).slice(0, 10).map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setSearchTerm(item.value)}
                      className="glass-button"
                      style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '6px', padding: '10px 12px', textAlign: 'left', background: 'rgba(255,255,255,0.03)' }}
                    >
                      {item.label}
                    </button>
                  ))
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '4px 2px' }}>No smart suggestions found.</div>
                )}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm('')} className="glass-button" style={{ padding: '12px 18px' }}>
              Clear
            </button>
          )}
          <button onClick={() => openModal()} className="glass-button" style={{ padding: '12px 24px', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            - Log Expense
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredExpenses.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No expense records found.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {filteredExpenses.map((item, index) => {
              const prev = filteredExpenses[index - 1];
              const isMonthStart = !prev || getMonthKey(item.date) !== getMonthKey(prev.date);
              const paymentLabel = item.credit_card_name
                ? `CC: ${item.credit_card_name}`
                : (item.bank_name ? `${item.bank_name} (${item.account_type})` : 'Unallocated');
              const paymentColor = getAccountTextColor(paymentLabel);
              return (
                <React.Fragment key={item.id}>
                  {isMonthStart && (
                    <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', background: getMonthStripStyle(item.date).bg, color: getMonthStripStyle(item.date).text, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: `1px solid ${getMonthStripStyle(item.date).border}` }}>
                      {getMonthLabel(item.date)}
                    </li>
                  )}
                  <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(150,150,150,0.1)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(150,150,150,0.03)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <strong style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.description || item.category} 
                        <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(150,150,150,0.1)', borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>{item.category}</span>
                      </strong>
                      <span className="text-muted" style={{ fontSize: '13px' }}>
                        {item.date ? new Date(item.date).toLocaleDateString() : 'Unknown Date'} • Paid via:{' '}
                        <span style={{ color: paymentColor, fontWeight: 700 }}>{paymentLabel}</span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#ef4444' }}>- C${parseFloat(item.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => openModal(item)} className="glass-button glass-button-warning" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>Edit</button>
                        <button onClick={() => handleDelete(item.id)} className="glass-button glass-button-danger" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>Delete</button>
                      </div>
                    </div>
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        )}
      </div>

      {isModalOpen && (
        <ModalWrapper title={editingId ? "Edit Expense" : "Log New Expense"} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Amount (CAD)</label>
                <input type="number" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box', fontSize: '1.1rem', fontWeight: 'bold' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Category *</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>
                <option value="">-- Select Category --</option>
                {categories.map(cat => ( <option key={cat.id} value={cat.id}>{cat.name}</option> ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Description / Merchant</label>
              <input type="text" placeholder="e.g., Walmart, Amazon, Hydro Bill" value={description} onChange={e => setDescription(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ borderTop: '1px solid rgba(150,150,150,0.1)', paddingTop: '16px', marginTop: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Payment Source</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}><input type="radio" checked={paymentSource === 'account'} onChange={() => { setPaymentSource('account'); setCreditCardId(''); }} />🏦 Bank Account</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}><input type="radio" checked={paymentSource === 'credit'} onChange={() => { setPaymentSource('credit'); setAccountId(''); }} />💳 Credit Card</label>
              </div>
              {paymentSource === 'account' ? (
                <select value={accountId} onChange={e => setAccountId(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>
                  <option value="">-- Keep Unallocated --</option>
                  {accounts.map(acc => ( <option key={acc.id} value={acc.id}>{acc.bank_name} {acc.account_type ? `(${acc.account_type})` : ''} - C${parseFloat(acc.balance).toFixed(2)}</option> ))}
                </select>
              ) : (
                <select value={creditCardId} onChange={e => setCreditCardId(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>
                  <option value="">-- Select Credit Card --</option>
                  {creditCards.map(cc => ( <option key={cc.id} value={cc.id}>{cc.name} - Bal: C${parseFloat(cc.balance).toFixed(2)}</option> ))}
                </select>
              )}
            </div>
            <button type="submit" className="glass-button" style={{ width: '100%', padding: '14px', marginTop: '10px', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {editingId ? "Update Expense" : "Confirm Payment"}
            </button>
          </form>
        </ModalWrapper>
      )}
    </div>
  );
};

export default Expenses;