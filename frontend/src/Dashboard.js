/**
 * Dhanapālana - Dashboard Component
 * Dashboard.js - Financial Overview and Analytics
 *
 * This component provides a comprehensive financial overview of the user's entire portfolio,
 * displaying key metrics, trends, and visualizations to help users understand their financial position.
 *
 * KEY FEATURES:
 * - Expense breakdown by category with pie charts
 * - Account balances (chequing and savings accounts)
 * - Credit card utilization and limits
 * - Capital movements (transfers and lending)
 * - Net worth calculation and display
 * - Real-time data synchronization with backend
 * - Responsive design with chart optimization
 *
 * DATA SOURCES:
 * - Dashboard API endpoint: /api/dashboard/summary
 * - Aggregates data from multiple financial endpoints
 * - Includes monthly trends, categories, and account details
 *
 * VISUALIZATIONS:
 * - Pie charts for expense category breakdown
 * - Card-based layouts for account summaries (Auto-expanding for 7+ items)
 * - Color-coded status indicators for financial health
 *
 * STATE MANAGEMENT:
 * - data: Central state for all dashboard information
 * - showIncomeMonths: Toggle for monthly income details
 * - showExpenseMonths: Toggle for monthly expense details
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip } from 'recharts';

/**
 * PIE CHART COLOR PALETTE
 * 20 distinct high-contrast colors for category visualization
 */
const PIE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', 
  '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71', 
  '#F1C40F', '#E74C3C', '#1ABC9C', '#34495E', '#8E44AD',
  '#16A085', '#27AE60', '#2980B9', '#8E44AD', '#F39C12'
];

const DASHBOARD_CARD_HEIGHT = '460px';
const DASHBOARD_CARD_PADDING = '28px';
const SUMMARY_CARD_MIN_HEIGHT = '176px';

/**
 * STATIC BAR CHART COMPONENT
 * Used for snapshot data like Account Balances, and locked-window History Charts.
 * SMART LAYOUT: Automatically spans 2 grid columns if there are more than 6 items to prevent squishing.
 */
const StaticBarChart = ({ title, chartData, colorHex }) => {
  if (!chartData || chartData.length === 0) return null;
  const totalSum = chartData.reduce((sum, item) => sum + item.balance, 0);
  
  // Smart-expand logic: If more than 6 bars are present, take up double the width
  const isWide = chartData.length > 6;

  return (
    <div className="glass-card" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: DASHBOARD_CARD_HEIGHT,
      padding: DASHBOARD_CARD_PADDING,
      boxSizing: 'border-box',
      gridColumn: isWide ? 'span 2' : 'auto' 
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '20px', gap: '4px' }}>
        <h3 style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: 'var(--text-muted)' }}>{title}</h3>
        <span style={{ fontWeight: 700, color: colorHex, fontSize: '1.5rem', lineHeight: '1' }}>
          C${totalSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-glass)" />
            <XAxis dataKey="name" axisLine={{ stroke: 'var(--border-glass)' }} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 11}} interval={0} angle={-45} textAnchor="end" dx={-5} dy={10} height={60} />
            <YAxis width={60} axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} tickFormatter={(val) => `$${val}`} />
            <BarTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} formatter={(value) => `C$${value.toFixed(2)}`} contentStyle={{ background: 'var(--bg-base)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-main)' }} />
            <Bar dataKey="balance" fill={colorHex} radius={[4, 4, 0, 0]} barSize={35} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};


const Dashboard = () => {
  const [data, setData] = useState(null);
  const [showIncomeMonths, setShowIncomeMonths] = useState(false);
  const [showExpenseMonths, setShowExpenseMonths] = useState(false);
  const API_URL = '/api';

  useEffect(() => {
    const fetchSummary = async () => {
      try { setData((await axios.get(`${API_URL}/dashboard/summary`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })).data); } 
      catch (err) { console.error("Failed to fetch summary:", err); }
    };
    fetchSummary();
  }, []);

  const formatMonth = (dateString) => {
    if (!dateString) return '';
    const [year, month] = dateString.split('-');
    return new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const formatShortMonth = (dateString) => {
    if (!dateString) return '';
    const [year, month] = dateString.split('-');
    return new Date(year, month - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
  };

  if (!data) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Syncing financial core...</div>;

  const monthStats = {};
  if (data.monthlyIncome) { data.monthlyIncome.forEach(m => { monthStats[m.month] = { income: parseFloat(m.total), expense: 0 }; }); }
  if (data.monthlyExpenses) {
    data.monthlyExpenses.forEach(m => {
      if (!monthStats[m.month]) monthStats[m.month] = { income: 0, expense: 0 };
      monthStats[m.month].expense = parseFloat(m.total);
    });
  }

  const totalIncomeColor = data.totalIncome >= data.totalExpenses ? 'var(--success)' : 'var(--danger)';
  const totalExpenseColor = data.totalExpenses > data.totalIncome ? 'var(--danger)' : 'var(--success)';

  const chequingData = data.bankData ? data.bankData
    .filter(d => d.name.toLowerCase().includes('(chequing)') || d.name.toLowerCase().includes('(checking)'))
    .map(d => ({ ...d, name: d.name.replace(/ \((Chequing|Checking)\)/i, '') })) 
    : [];

  const savingsData = data.bankData ? data.bankData
    .filter(d => d.name.toLowerCase().includes('(savings)'))
    .map(d => ({ ...d, name: d.name.replace(/ \(Savings\)/i, '') })) 
    : [];
  
  const creditData = data.creditData ? data.creditData.map(d => ({ ...d, balance: -d.balance })) : [];

  // Reverses chronological order, extracts names, and strictly limits to the most recent 6 months
  const incomeChartData = data.monthlyIncome ? [...data.monthlyIncome].reverse().map(d => ({ name: formatShortMonth(d.month), balance: parseFloat(d.total) })).slice(-6) : [];
  const expenseChartData = data.monthlyExpenses ? [...data.monthlyExpenses].reverse().map(d => ({ name: formatShortMonth(d.month), balance: parseFloat(d.total) })).slice(-6) : [];

  const validCategories = data.categoryData ? data.categoryData.filter(item => item.value > 0) : [];
  const totalExpenseAmount = validCategories.reduce((sum, item) => sum + item.value, 0);
  
  const pieData = validCategories.map(item => ({
    ...item,
    name: `${item.name} ${totalExpenseAmount > 0 ? Math.round((item.value / totalExpenseAmount) * 100) : 0}%`
  })).sort((a, b) => b.value - a.value);

  const renderLedger = (title, items, isExpenseType, colorVar) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: DASHBOARD_CARD_PADDING }}>
        <h3 style={{ margin: '0 0 20px 0', fontWeight: 600 }}>{title}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map((act, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-glass)' }}>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '6px', fontSize: '15px' }}>{act.description || 'Uncategorized'}</strong>
                <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', background: 'var(--bg-base)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {act.type} • {new Date(act.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                </span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: colorVar }}>
                {isExpenseType ? '-' : '+'}C${Math.abs(parseFloat(act.amount)).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: 800 }}>Financial Core Overview</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '15px' }}>Your assets, liabilities, and monthly movements.</p>
      </div>
      
      {/* TOP SUMMARY CARDS */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ minHeight: SUMMARY_CARD_MIN_HEIGHT, height: 'max-content', padding: DASHBOARD_CARD_PADDING }}>
          <h4 style={{ color: 'var(--text-muted)', margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase' }}>Net Worth</h4>
          <h2 className="gradient-text" style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800 }}>C${data.netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
          <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>Includes <strong style={{ color: 'var(--accent-blue)' }}>C${data.totalInvestments.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> in Investments</div>
        </div>

        <div className="glass-card" onClick={() => setShowIncomeMonths(!showIncomeMonths)} style={{ borderTop: `4px solid ${totalIncomeColor}`, cursor: 'pointer', minHeight: SUMMARY_CARD_MIN_HEIGHT, height: 'max-content', padding: DASHBOARD_CARD_PADDING }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h4 style={{ color: 'var(--text-muted)', margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase' }}>Total Inflow {showIncomeMonths ? '▲' : '▼'}</h4>
          </div>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: totalIncomeColor }}>C${data.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
          {showIncomeMonths && data.monthlyIncome && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
              {data.monthlyIncome.map(m => {
                const inc = parseFloat(m.total);
                const exp = monthStats[m.month]?.expense || 0;
                const dynamicColor = exp > inc ? 'var(--danger)' : 'var(--success)';
                return (
                  <div key={m.month} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{formatMonth(m.month)}</span>
                    <span style={{ color: dynamicColor, fontWeight: 'bold' }}>+C${inc.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card" onClick={() => setShowExpenseMonths(!showExpenseMonths)} style={{ borderTop: `4px solid ${totalExpenseColor}`, cursor: 'pointer', minHeight: SUMMARY_CARD_MIN_HEIGHT, height: 'max-content', padding: DASHBOARD_CARD_PADDING }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h4 style={{ color: 'var(--text-muted)', margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase' }}>Total Expenses {showExpenseMonths ? '▲' : '▼'}</h4>
          </div>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: totalExpenseColor }}>C${data.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
          {showExpenseMonths && data.monthlyExpenses && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
              {data.monthlyExpenses.map(m => {
                const exp = parseFloat(m.total);
                const inc = monthStats[m.month]?.income || 0;
                const dynamicColor = exp > inc ? 'var(--danger)' : 'var(--success)';
                return (
                  <div key={m.month} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{formatMonth(m.month)}</span>
                    <span style={{ color: dynamicColor, fontWeight: 'bold' }}>-C${exp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card" style={{ borderTop: '4px solid var(--danger)', minHeight: SUMMARY_CARD_MIN_HEIGHT, height: 'max-content', padding: DASHBOARD_CARD_PADDING }}>
          <h4 style={{ color: 'var(--text-muted)', margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase' }}>Credit Debt</h4>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>C${data.totalCreditDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
          <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>Utilization: <strong style={{ color: data.creditUtilization > 30 ? 'var(--danger)' : 'var(--success)' }}>{data.creditUtilization.toFixed(1)}%</strong></div>
        </div>
      </div>

      {/* PRIMARY CHART GRID: Accounts and Pie Chart (Top Row) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <StaticBarChart title="Chequing Accounts" chartData={chequingData} colorHex="var(--accent-blue)" />
        <StaticBarChart title="Savings Accounts" chartData={savingsData} colorHex="var(--success)" />
        
        {pieData.length > 0 && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: DASHBOARD_CARD_HEIGHT, gridColumn: 'span 2', padding: DASHBOARD_CARD_PADDING }}>
            <h3 style={{ margin: '0 0 10px 0', fontWeight: 600, fontSize: '15px', color: 'var(--text-muted)' }}>Expense Distribution</h3>
            <div style={{ flex: '0 0 66%', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={72} outerRadius={112} paddingAngle={3} stroke="none">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <PieTooltip formatter={(value) => `C$${value.toFixed(2)}`} contentStyle={{ background: 'var(--bg-base)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-main)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{
              flex: '1 1 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '9px 16px',
              alignContent: 'start',
              padding: '12px 8px 16px',
            }}>
              {pieData.map((entry, index) => (
                <div key={`legend-item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: PIE_COLORS[index % PIE_COLORS.length],
                    flex: '0 0 10px',
                  }} />
                  <span style={{
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    lineHeight: '1.2',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }} title={entry.name}>
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECONDARY CHART GRID: Credit, Capital, and History using standard 300px uniformity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <StaticBarChart title="Credit Debt" chartData={creditData} colorHex="var(--danger)" />

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: DASHBOARD_CARD_HEIGHT, padding: DASHBOARD_CARD_PADDING }}>
          <h3 style={{ margin: '0 0 20px 0', fontWeight: 600, fontSize: '15px', color: 'var(--text-muted)' }}>Capital Movement</h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px' }}>
            <div style={{ background: 'var(--bg-base)', padding: '24px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Transferred</span>
              <strong style={{ display: 'block', fontSize: '28px', color: 'var(--accent-cyan)', marginTop: '8px' }}>
                C${(data.totalTransfers || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </strong>
              {data.totalTransfersINR > 0 && (
                <span style={{ fontSize: '14px', color: '#8b5cf6', fontWeight: 'bold', display: 'block', marginTop: '6px' }}>
                  ₹{(data.totalTransfersINR).toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR
                </span>
              )}
            </div>
            <div style={{ background: 'var(--bg-base)', padding: '24px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Lending</span>
              <strong style={{ display: 'block', fontSize: '28px', color: 'var(--warning)', marginTop: '8px' }}>
                C${(data.totalOwedToYou || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        {/* History charts using the sliced data variables to enforce a locked 6-month window */}
        <StaticBarChart title="Income History (Last 6 Months)" chartData={incomeChartData} colorHex="var(--success)" />
        <StaticBarChart title="Expense History (Last 6 Months)" chartData={expenseChartData} colorHex="var(--danger)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
        {renderLedger('Recent Income', data.recentIncome, false, 'var(--success)')}
        {renderLedger('Recent Expenses', data.recentExpenses, true, 'var(--danger)')}
        {renderLedger('Recent Transfers', data.recentTransfers, true, 'var(--accent-cyan)')}
        {renderLedger('Recent Lending', data.recentLending, true, 'var(--warning)')}
      </div>
    </div>
  );
};

export default Dashboard;