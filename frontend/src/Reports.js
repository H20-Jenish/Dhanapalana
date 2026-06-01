import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { showAlert } from './dialogService';

const formatMonth = (monthString) => {
  if (!monthString) return '';
  const [year, month] = monthString.split('-');
  return new Date(Number(year), Number(month) - 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
};

const formatPreviousMonth = (monthString) => {
  if (!monthString) return '';
  const [year, month] = monthString.split('-').map(Number);
  const previousDate = new Date(year, month - 2, 1);
  return previousDate.toLocaleString('default', { month: 'long', year: 'numeric' });
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDiff = (value) => {
  const amount = Number(value || 0);
  return `${amount >= 0 ? '+' : '-'}C$ ${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const safeText = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-CA');
};

const makeRows = (rows, mapper) => {
  if (!rows || rows.length === 0) return '<tr><td colspan="20" style="padding:10px;color:#6b7280;">No records.</td></tr>';
  return rows.map((row) => `<tr>${mapper(row)}</tr>`).join('');
};

const buildMonthlySummaryHtml = (payload) => {
  const summary = payload.summary || {};
  const accountActivity = Object.entries(payload.accountActivity || {}).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0));

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Monthly Summary - ${safeText(payload.month)}</title>
    <style>
      body { font-family: Segoe UI, Arial, sans-serif; margin: 24px; color: #111827; background: #f8fafc; }
      h1, h2, h3 { margin: 0 0 8px 0; }
      .muted { color: #6b7280; }
      .grid { display: grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 12px; margin: 16px 0 20px; }
      .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
      .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; }
      .value { font-size: 20px; font-weight: 700; margin-top: 4px; }
      .section { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border-bottom: 1px solid #e5e7eb; text-align: left; padding: 8px; font-size: 13px; }
      th { color: #374151; background: #f9fafb; }
      .tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; background: #eef2ff; color: #3730a3; }
      .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    </style>
  </head>
  <body>
    <h1>Monthly Financial Summary</h1>
    <p class="muted">Month: ${safeText(payload.month)} (${safeText(formatMonth(payload.month))})</p>
    <p class="muted">Generated: ${safeText(formatDate(payload.generatedAt))} • Timezone: ${safeText(payload.timezone || 'UTC')}</p>

    <div class="grid">
      <div class="card"><div class="label">Income</div><div class="value">C$ ${Number(summary.income || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
      <div class="card"><div class="label">Expense</div><div class="value">C$ ${Number(summary.expense || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
      <div class="card"><div class="label">Net Flow</div><div class="value">C$ ${Number(summary.net || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
      <div class="card"><div class="label">Savings Rate</div><div class="value">${Number(summary.savingsRate || 0).toFixed(1)}%</div></div>
    </div>

    <div class="section">
      <h3>Category Comparison</h3>
      <table>
        <thead><tr><th>Category</th><th>Current</th><th>Previous</th><th>Diff</th><th>Diff %</th></tr></thead>
        <tbody>${makeRows(payload.categoryComparison || [], (row) => `
          <td>${safeText(row.category)}</td>
          <td>C$ ${Number(row.current || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>C$ ${Number(row.previous || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${Number(row.diff || 0) >= 0 ? '+' : ''}C$ ${Math.abs(Number(row.diff || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${Number(row.pct || 0).toFixed(1)}%</td>
        `)}</tbody>
      </table>
    </div>

    <div class="section">
      <h3>Account Activity</h3>
      <table>
        <thead><tr><th>Account</th><th>Transaction Count</th></tr></thead>
        <tbody>${makeRows(accountActivity, ([name, count]) => `
          <td>${safeText(name)}</td>
          <td>${Number(count || 0)}</td>
        `)}</tbody>
      </table>
    </div>

    <div class="two">
      <div class="section">
        <h3>Income Transactions</h3>
        <table>
          <thead><tr><th>Date</th><th>Source</th><th>Account</th><th>Amount</th></tr></thead>
          <tbody>${makeRows(payload.incomeTransactions || [], (row) => `
            <td>${safeText(formatDate(row.date))}</td>
            <td>${safeText(row.source)}</td>
            <td>${safeText(`${row.bank_name || 'Vault'}${row.account_type ? ` (${row.account_type})` : ''}`)}</td>
            <td>C$ ${Number(row.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          `)}</tbody>
        </table>
      </div>
      <div class="section">
        <h3>Expense Transactions</h3>
        <table>
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Paid Via</th><th>Amount</th></tr></thead>
          <tbody>${makeRows(payload.expenseTransactions || [], (row) => `
            <td>${safeText(formatDate(row.date))}</td>
            <td>${safeText(row.description || '-')}</td>
            <td>${safeText(row.category)}</td>
            <td>${safeText(row.credit_card_name ? `CC: ${row.credit_card_name}` : `${row.bank_name || 'Vault'}${row.account_type ? ` (${row.account_type})` : ''}`)}</td>
            <td>C$ ${Number(row.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          `)}</tbody>
        </table>
      </div>
    </div>

    <div class="two">
      <div class="section">
        <h3>Bank Statement Snapshot (Total Left)</h3>
        <table>
          <thead><tr><th>Bank</th><th>Type</th><th>Currency</th><th>Balance</th></tr></thead>
          <tbody>${makeRows(payload.bankStatements || [], (row) => `
            <td>${safeText(row.bank_name)}</td>
            <td>${safeText(row.account_type || '-')}</td>
            <td>${safeText(row.currency || 'CAD')}</td>
            <td>${safeText(row.currency || 'CAD')} ${Number(row.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          `)}</tbody>
        </table>
      </div>
      <div class="section">
        <h3>Credit Card Usage</h3>
        <table>
          <thead><tr><th>Card</th><th>Monthly Spend</th><th>Current Balance</th><th>Limit</th></tr></thead>
          <tbody>${makeRows(payload.creditCardUsage || [], (row) => `
            <td>${safeText(row.name)}</td>
            <td>C$ ${Number(row.monthly_spend || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>C$ ${Number(row.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>C$ ${Number(row.limit_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          `)}</tbody>
        </table>
      </div>
    </div>

    <div class="two">
      <div class="section">
        <h3>Investments (Monthly Value Changes)</h3>
        <table>
          <thead><tr><th>Asset</th><th>Type</th><th>Date</th><th>Previous</th><th>Balance</th><th>Contribution</th><th>Gain/Loss</th></tr></thead>
          <tbody>${makeRows(payload.investmentChanges || [], (row) => `
            <td>${safeText(row.name)}</td>
            <td>${safeText(row.type)}</td>
            <td>${safeText(formatDate(row.date))}</td>
            <td>C$ ${Number(row.previous_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>C$ ${Number(row.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>C$ ${Number(row.net_contribution || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${Number(row.gain_loss || 0) >= 0 ? '+' : ''}C$ ${Math.abs(Number(row.gain_loss || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          `)}</tbody>
        </table>
      </div>
      <div class="section">
        <h3>Transfers</h3>
        <table>
          <thead><tr><th>Date</th><th>Recipient</th><th>Method</th><th>Amount</th></tr></thead>
          <tbody>${makeRows(payload.transfers || [], (row) => `
            <td>${safeText(formatDate(row.date))}</td>
            <td>${safeText(row.recipient)}</td>
            <td><span class="tag">${safeText(row.method)}</span></td>
            <td>C$ ${Number(row.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          `)}</tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <h3>Lending</h3>
      <table>
        <thead><tr><th>Date</th><th>Recipient</th><th>Method</th><th>Loaned</th><th>Repaid</th><th>Outstanding</th></tr></thead>
        <tbody>${makeRows(payload.lending || [], (row) => `
          <td>${safeText(formatDate(row.date))}</td>
          <td>${safeText(row.recipient)}</td>
          <td>${safeText(row.method)}</td>
          <td>C$ ${Number(row.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>C$ ${Number(row.repaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>C$ ${Math.max(Number(row.amount || 0) - Number(row.repaid || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `)}</tbody>
      </table>
    </div>
  </body>
</html>`;
};

const getLabelTextColor = (label) => {
  const palettes = [
    '#93c5fd', '#6ee7b7', '#fcd34d', '#c4b5fd', '#f9a8d4', '#67e8f9', '#bef264', '#fda4af'
  ];

  const key = String(label || '');
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

const MonthCard = ({ report, isSelected, onSelect, onDownload, isDownloading }) => {
  const savingsRate = Number(report.savingsRate || 0);
  const net = Number(report.net || 0);
  const isPositive = net >= 0;
  const categories = Array.isArray(report.catComparison) ? report.catComparison : [];
  const categoryCount = categories.length;
  const accountEntries = Object.entries(report.accounts || {});
  const totalAccountTransactions = accountEntries.reduce((sum, [, count]) => sum + Number(count || 0), 0);
  const previousMonthLabel = formatPreviousMonth(report.month);

  return (
    <div
      className="glass-card"
      onClick={onSelect}
      style={{
        position: 'relative',
        padding: '20px',
        borderTop: report.isCurrentMonth ? '4px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
        boxShadow: isSelected && !report.isCurrentMonth ? '0 0 0 1px rgba(34, 211, 238, 0.2) inset' : 'none',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
      }}
    >
      {report.isCurrentMonth && (
        <span style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--accent-cyan)', color: '#000', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '12px' }}>
          CURRENT
        </span>
      )}

      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', fontWeight: 800 }}>{formatMonth(report.month)}</h2>
        <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>
          {categoryCount} expense categories compared with {previousMonthLabel || 'the previous month'}
        </p>
        <div style={{ marginTop: '10px' }}>
          <button
            type="button"
            className="glass-button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(report.month);
            }}
            disabled={isDownloading}
            style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700 }}
          >
            {isDownloading ? 'Preparing...' : 'Download Summary'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: 'rgba(59,130,246,0.08)', borderRadius: '14px', padding: '14px' }}>
          <div className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Income</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '4px', color: 'var(--success)' }}>C$ {formatCurrency(report.income)}</div>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: '14px', padding: '14px' }}>
          <div className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Expenses</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '4px', color: 'var(--danger)' }}>C$ {formatCurrency(report.expense)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-glass)' }}>
        <div>
          <div className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px' }}>Net Cash Flow</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
            {isPositive ? '+' : ''}C$ {formatCurrency(net)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '4px' }}>Savings Rate</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: savingsRate >= 20 ? 'var(--success)' : 'var(--warning)' }}>{savingsRate}%</div>
        </div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <h4 style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.8px' }}>
          Category Breakdown (vs Previous Month)
        </h4>
        <div style={{ maxHeight: '230px', overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {categories.length === 0 ? (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No expense data for this month.</span>
          ) : (
            categories.map((category) => (
              <div key={category.category} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700 }}>{category.category}</div>
                  <div style={{ color: category.diff > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {category.diff > 0 ? 'Higher' : category.diff < 0 ? 'Lower' : 'Same'}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>Spent: C$ {formatCurrency(category.current)}</span>
                  <span>Prev: C$ {formatCurrency(category.previous)}</span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 700, color: category.diff > 0 ? 'var(--danger)' : category.diff < 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                  {category.diff > 0 ? `Higher than ${previousMonthLabel || 'previous month'}` : category.diff < 0 ? `Lower than ${previousMonthLabel || 'previous month'}` : `Same as ${previousMonthLabel || 'previous month'}`}
                  <span style={{ fontWeight: 600, marginLeft: '8px', color: 'var(--text-muted)' }}>{formatDiff(category.diff)} ({category.pct}%)</span>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <div className="progress-bg" style={{ height: '8px' }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(Number(category.pct || 0), 100)}%`,
                        background: category.diff > 0 ? 'var(--danger)' : 'var(--success)',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h4 style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <span>Accounts Used</span>
          <span style={{ color: 'var(--accent-cyan)' }}>{totalAccountTransactions} transactions</span>
        </h4>
        {accountEntries.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {accountEntries
              .sort((a, b) => b[1] - a[1])
              .map(([accountName, count]) => {
                const textColor = getLabelTextColor(accountName);
                return (
                  <span key={accountName} style={{ padding: '2px 0', fontSize: '12px', color: textColor, fontWeight: 700 }}>
                    {accountName}: <strong style={{ color: 'var(--accent-cyan)' }}>{count}</strong>
                  </span>
                );
              })}
          </div>
        ) : (
          <div className="text-muted" style={{ fontSize: '13px' }}>No account activity recorded for this month.</div>
        )}
      </div>

      <div style={{ marginTop: '18px', background: 'var(--bg-base)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
          <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Savings Target</span>
          <span style={{ color: savingsRate >= 20 ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold' }}>{savingsRate}% / 20%</span>
        </div>
        <div className="progress-bg">
          <div className="progress-fill" style={{ width: `${Math.min(savingsRate, 100)}%`, background: savingsRate >= 20 ? 'var(--success)' : 'var(--warning)' }} />
        </div>
      </div>
    </div>
  );
};

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [downloadingMonth, setDownloadingMonth] = useState('');

  const downloadMonthlySummary = async (month) => {
    try {
      setDownloadingMonth(month);
      const response = await axios.get(`/api/reports/monthly/${month}/download`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const html = buildMonthlySummaryHtml(response.data || {});
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monthly_summary_${month}.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download monthly summary', error);
      await showAlert('Failed to download monthly summary.');
    } finally {
      setDownloadingMonth('');
    }
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await axios.get('/api/reports/monthly', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const rows = Array.isArray(response.data) ? response.data : [];
        setReports(rows);
        if (rows.length > 0) {
          setSelectedMonth(rows[0].month);
        }
      } catch (error) {
        console.error('Failed to load monthly reports', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return <div style={{ padding: '32px', color: 'var(--text-muted)' }}>Loading monthly reports...</div>;
  }

  if (!reports.length) {
    return <div style={{ padding: '32px', color: 'var(--text-muted)' }}>No monthly report data is available yet.</div>;
  }

  const selectedReport = reports.find((report) => report.month === selectedMonth) || reports[0] || null;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: 800, letterSpacing: '-0.5px' }}>Monthly Reports</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: '15px' }}>
            Review monthly income, expenses, category shifts, and account transaction counts.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '240px', marginLeft: 'auto' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Focus month</label>
          <select className="glass-input" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ minWidth: '220px' }}>
            {reports.map((report) => (
              <option key={report.month} value={report.month}>{formatMonth(report.month)}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedReport && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="glass-card" style={{ padding: '18px' }}>
            <div className="text-muted" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Income</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px', color: 'var(--success)' }}>C$ {formatCurrency(selectedReport.income)}</div>
          </div>
          <div className="glass-card" style={{ padding: '18px' }}>
            <div className="text-muted" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Expenses</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px', color: 'var(--danger)' }}>C$ {formatCurrency(selectedReport.expense)}</div>
          </div>
          <div className="glass-card" style={{ padding: '18px' }}>
            <div className="text-muted" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Net Flow</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px', color: Number(selectedReport.net || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>C$ {formatCurrency(selectedReport.net)}</div>
          </div>
          <div className="glass-card" style={{ padding: '18px' }}>
            <div className="text-muted" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Savings Rate</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px' }}>{selectedReport.savingsRate}%</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {reports.map((report) => (
          <MonthCard
            key={report.month}
            report={report}
            isSelected={report.month === selectedMonth}
            onSelect={() => setSelectedMonth(report.month)}
            onDownload={downloadMonthlySummary}
            isDownloading={downloadingMonth === report.month}
          />
        ))}
      </div>
    </div>
  );
};

export default Reports;
