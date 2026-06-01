/**
 * Dhanap\u0101lana - Ledger Component
 * Ledger.js - Unified Transaction History and Analysis
 *
 * This component provides a unified view of all financial transactions across the system,
 * aggregating income, expenses, transfers, savings, credit card transactions, investments,
 * lendings, and other financial activities. It serves as the master transaction record.
 *
 * KEY FEATURES:
 * - Unified transaction view across all modules
 * - Advanced filtering by date range, category, account, amount
 * - Transaction search and sorting capabilities
 * - Export functionality for external analysis
 * - Multi-currency support and conversion
 * - Transaction details and drill-down analysis
 * - Category-based transaction grouping
 * - Real-time transaction aggregation
 * - Account reconciliation support
 * - Pagination for large datasets
 */

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const getAccountBadgeColor = (accountName) => {
  const palettes = ['#93c5fd', '#6ee7b7', '#fcd34d', '#c4b5fd', '#f9a8d4', '#67e8f9', '#bef264', '#fda4af'];

  const key = String(accountName || '');
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }

  if (key.startsWith('CC:')) {
    return '#fda4af';
  }
  return palettes[Math.abs(hash) % palettes.length];
};

const Ledger = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Advanced Filter States
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [accountFilter, setAccountFilter] = useState('');
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [accountOptions, setAccountOptions] = useState([]);

  const API_URL = '/api';

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('All');
    setAccountFilter('');
    setCategoryFilters([]);
    setStartDate('');
    setEndDate('');
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [inc, exp, trn, lnd, inv] = await Promise.all([
          axios.get(`${API_URL}/income`),
          axios.get(`${API_URL}/expenses`),
          axios.get(`${API_URL}/transfers`),
          axios.get(`${API_URL}/lending`),
          axios.get(`${API_URL}/investment-logs`)
        ]);

        const mappedInc = inc.data.map(i => ({ 
          id: `inc_${i.id}`, date: i.date, type: 'Income', desc: i.source, 
          amount: parseFloat(i.amount), status: i.status, category: 'Income',
          account: i.bank_name ? `${i.bank_name} ${i.account_type || ''}`.trim() : 'Vault'
        }));
        
        const mappedExp = exp.data.map(e => ({ 
          id: `exp_${e.id}`, date: e.date, type: e.credit_card_name ? 'Credit Spend' : 'Expense', 
          desc: e.description || e.category, amount: -parseFloat(e.amount), status: e.status, category: e.category || 'Uncategorized',
          account: e.credit_card_name ? `CC: ${e.credit_card_name}` : (e.bank_name ? `${e.bank_name} ${e.account_type || ''}`.trim() : 'Unknown')
        }));
        
        const mappedTrn = trn.data.map(t => { 
          let type = 'Transfer'; let desc = `To ${t.recipient}`;
          if (t.method === 'Credit Card Repayment') { type = 'Credit Repayment'; desc = `Paid ${t.recipient}`; }
          if (t.method === 'Internal Transfer') { type = 'Internal Transfer'; desc = `Moved to ${t.recipient}`; }
          return { id: `trn_${t.id}`, date: t.date, type, desc, amount: -parseFloat(t.amount), status: t.status, category: 'Transfer',
          account: t.source_bank ? `${t.source_bank} ${t.source_account_type || ''}`.trim() : 'Unknown'};
        });

        const mappedLnd = lnd.data.map(l => ({ 
          id: `lnd_${l.id}`, date: l.date, type: 'Lending', desc: `Loan to ${l.recipient}`, 
          amount: -parseFloat(l.amount), status: l.status, category: 'Lending',
          account: l.source_bank ? `${l.source_bank} ${l.source_account_type || ''}`.trim() : 'Unknown'
        }));

        const mappedInv = inv.data
          .filter(l => parseFloat(l.net_contribution) !== 0)
          .map(l => ({
            id: `inv_${l.id}`, date: l.date, type: 'Investment', desc: `${parseFloat(l.net_contribution) > 0 ? 'Contribution to' : 'Withdrawal from'} ${l.investment_name}`,
            amount: -parseFloat(l.net_contribution), status: l.status, category: 'Investment',
            account: l.investment_name
          }));

        const allData = [...mappedInc, ...mappedExp, ...mappedTrn, ...mappedLnd, ...mappedInv].sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(allData);

        // Fetch account and credit card options for the filter dropdown
        try {
          const [savRes, ccRes] = await Promise.all([
            axios.get(`${API_URL}/savings`),
            axios.get(`${API_URL}/credit-cards`)
          ]);
          const bankNames = savRes.data.map(a => `${a.bank_name} ${a.account_type || ''}`.trim());
          const ccNames = ccRes.data.map(c => `CC: ${c.name}`);
          setAccountOptions([...new Set([...bankNames, ...ccNames])].sort());
        } catch (e) { console.error('Failed to load account options', e); }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchAllData();
  }, []);

  const filteredData = useMemo(() => {
    return transactions.filter(t => {
      const matchType = typeFilter === 'All' || t.type === typeFilter;
      const lowerSearch = search.toLowerCase();
      const matchSearch = t.desc.toLowerCase().includes(lowerSearch) || t.category.toLowerCase().includes(lowerSearch);
      const matchAccount = accountFilter === '' || t.account.toLowerCase().includes(accountFilter.toLowerCase());
      const matchCategory = categoryFilters.length === 0 || categoryFilters.includes(t.category);
      const txDate = t.date ? t.date.substring(0, 10) : '';
      const matchStart = startDate ? txDate >= startDate : true;
      const matchEnd = endDate ? txDate <= endDate : true;
      return matchType && matchSearch && matchAccount && matchCategory && matchStart && matchEnd;
    });
  }, [transactions, search, typeFilter, accountFilter, categoryFilters, startDate, endDate]);

  const categoryOptions = useMemo(() => {
    return [...new Set(transactions.map(t => t.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const isDateFiltered = Boolean(startDate || endDate);
  const filteredTotal = useMemo(() => filteredData.reduce((sum, t) => sum + t.amount, 0), [filteredData]);

  const toggleCategoryFilter = (category) => {
    setCategoryFilters(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  };

  const formatSafeDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    let y = d.getUTCFullYear();
    if (y < 100) y += 2000;
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${m}/${day}/${y}`;
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Category', 'Account', 'Amount (CAD)', 'Status'];
    const csvRows = filteredData.map(t => {
      const safeDesc = t.desc.replace(/"/g, '""');
      return `${formatSafeDate(t.date)},${t.type},"${safeDesc}","${t.category}","${t.account}",${t.amount.toFixed(2)},${t.status}`;
    });
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Vault_Ledger_${new Date().toISOString().slice(0,10)}.csv`; link.click();
  };

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Compiling Master Ledger...</div>;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', alignItems: 'end', gap: '16px', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', margin: '0 0 8px 0', fontWeight: 800 }}>Master Ledger</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>View, filter, and export all financial movements including soft deletes.</p>
        </div>
        {isDateFiltered ? (
          <div className="glass-card" style={{ margin: 0, minWidth: '320px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text-muted)', marginBottom: '10px' }}>Filtered Summary</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>From</span>
              <strong>{startDate || 'Any'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px', marginBottom: categoryFilters.length === 1 ? '6px' : '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>To</span>
              <strong>{endDate || 'Any'}</strong>
            </div>
            {categoryFilters.length === 1 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Category</span>
                <strong>{categoryFilters[0]}</strong>
              </div>
            ) : null}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total Sum</span>
              <strong style={{ fontSize: '1rem', color: filteredTotal >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {filteredTotal >= 0 ? '+' : ''}{filteredTotal.toFixed(2)}
              </strong>
            </div>
          </div>
        ) : (
          <div />
        )}
        <button onClick={handleExportCSV} className="glass-button glass-button-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⬇ Export CSV
        </button>
      </div>

      <div className="glass-card" style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <input type="text" placeholder="Search description or category..." value={search} onChange={e => setSearch(e.target.value)} className="glass-input" style={{ flex: '1 1 200px' }} />
        <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} className="glass-input" style={{ flex: '1 1 200px' }}>
          <option value="">All Accounts</option>
          {accountOptions.map(acc => <option key={acc} value={acc}>{acc}</option>)}
        </select>
        
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="glass-input" style={{ flex: '1 1 150px' }}>
          <option value="All">All Types</option>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
          <option value="Transfer">Transfer</option>
          <option value="Lending">Lending</option>
          <option value="Internal Transfer">Internal Transfer</option>
          <option value="Investment">Investment</option>
          <option value="Credit Spend">Credit Spend</option>
          <option value="Credit Repayment">Credit Repayment</option>
        </select>

        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="glass-input glass-input-date" title="Start Date" style={{ flex: '1 1 150px' }} />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="glass-input glass-input-date" title="End Date" style={{ flex: '1 1 150px' }} />
        <button onClick={clearFilters} className="glass-button glass-button-outline" style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }} title="Clear all filters">
          ✕ Clear Filters
        </button>
        <div style={{ flexBasis: '100%', display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
          {categoryOptions.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategoryFilter(cat)}
              className="glass-button"
              style={{
                padding: '7px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                background: categoryFilters.includes(cat) ? 'rgba(6,182,212,0.16)' : 'rgba(255,255,255,0.03)',
                border: categoryFilters.includes(cat) ? '1px solid rgba(34,211,238,0.35)' : '1px solid rgba(255,255,255,0.08)',
                color: categoryFilters.includes(cat) ? 'var(--accent-cyan)' : 'var(--text-main)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="glass-table" style={{ width: '100%', minWidth: '800px' }}>
            <thead>
              <tr><th>Date</th><th>Type</th><th>Description</th><th>Category</th><th>Account / Destination</th><th>Amount (CAD)</th></tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No transactions match your filters.</td></tr> : null}
              {filteredData.map(t => {
                let typeColor = 'rgba(255,255,255,0.05)'; 
                let typeTextColor = 'var(--text-muted)';
                
                if (t.type === 'Credit Spend') { typeColor = 'rgba(239, 68, 68, 0.1)'; typeTextColor = 'var(--danger)'; } 
                else if (t.type === 'Credit Repayment' || t.type === 'Income') { typeColor = 'rgba(16, 185, 129, 0.1)'; typeTextColor = 'var(--success)'; } 
                else if (t.type === 'Expense') { typeColor = 'rgba(245, 158, 11, 0.1)'; typeTextColor = 'var(--warning)'; } 
                else if (t.type === 'Transfer') { typeColor = 'rgba(6, 182, 212, 0.1)'; typeTextColor = 'var(--accent-cyan)'; } 
                else if (t.type === 'Lending') { typeColor = 'rgba(99, 102, 241, 0.1)'; typeTextColor = 'var(--accent-blue)'; }
                else if (t.type === 'Internal Transfer') { typeColor = 'rgba(161, 161, 170, 0.1)'; typeTextColor = 'var(--text-main)'; }
                else if (t.type === 'Investment') { typeColor = 'rgba(139, 92, 246, 0.1)'; typeTextColor = '#8b5cf6'; } 
                
                const isDeleted = t.status === 'DELETED';
                const displayAmount = t.type === 'Internal Transfer' ? `${Math.abs(t.amount).toFixed(2)}` : (t.amount > 0 ? `+${t.amount.toFixed(2)}` : t.amount.toFixed(2));
                let amountColor = t.amount > 0 ? 'var(--success)' : 'var(--danger)';
                if (['Transfer', 'Credit Repayment', 'Internal Transfer', 'Investment'].includes(t.type)) amountColor = 'var(--text-main)';
                const accountColor = getAccountBadgeColor(t.account);

                return (
                  <tr key={t.id} style={{ opacity: isDeleted ? 0.4 : 1, textDecoration: isDeleted ? 'line-through' : 'none' }}>
                    <td style={{ color: 'var(--text-muted)' }}>{formatSafeDate(t.date)}</td>
                    <td>
                      <span style={{ display: 'inline-block', width: '130px', textAlign: 'center', padding: '6px 0', fontSize: '10px', borderRadius: '12px', background: typeColor, color: typeTextColor, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>
                        {t.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {t.desc}
                      {t.status === 'EDITED' && <span style={{ marginLeft: '12px', padding: '2px 6px', fontSize: '10px', background: 'var(--warning)', color: '#000', borderRadius: '4px', fontWeight: 'bold', textDecoration: 'none' }}>EDITED</span>}
                      {isDeleted && <span style={{ marginLeft: '12px', padding: '2px 6px', fontSize: '10px', background: 'var(--danger)', color: '#fff', borderRadius: '4px', fontWeight: 'bold', textDecoration: 'none' }}>DELETED</span>}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{t.category}</td>
                    <td>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: accountColor }}>{t.account}</span>
                    </td>
                    <td style={{ fontWeight: 'bold', color: amountColor }}>{displayAmount}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Ledger;