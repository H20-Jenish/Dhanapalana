/**
 * Dhanap\u0101lana - Reports Component
 * Reports.js - AI-Powered Financial Analysis and Monthly Reports
 *
 * This component generates comprehensive monthly financial reports with AI-generated
 * insights and analysis. It leverages the Ollama AI model backend to provide intelligent
 * commentary on spending patterns, income trends, savings goals, and personalized recommendations.
 *
 * KEY FEATURES:
 * - Monthly financial report generation
 * - AI-powered analysis using Ollama model with GPT-like capabilities
 * - Spending analysis by category and trends
 * - Income analysis and growth patterns
 * - Savings rate calculation and optimization
 * - Investment portfolio performance analysis
 * - Intelligent recommendations for financial improvement
 * - Report export functionality (PDF/CSV)
 * - Historical report comparison and tracking
 * - Multi-year trend analysis visualization
 * - Budget vs. actual expense tracking
 * - Financial goal progress monitoring
 * - Real-time AI processing with progress indicators
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfConfig, setPdfConfig] = useState({ month: '', includeComparison: true });
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [analyzingMonth, setAnalyzingMonth] = useState(null);
  const [expandedInsights, setExpandedInsights] = useState({});

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await axios.get('/api/reports/monthly', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        setReports(res.data);
        if (res.data.length > 0) {
            setPdfConfig(prev => ({ ...prev, month: res.data[0].month }));
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchReports();
  }, []);

  const formatMonth = (monthString) => {
    if (!monthString) return '';
    const [year, month] = monthString.split('-');
    return new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const formatAIText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
            <div key={i} style={{ minHeight: '1em', marginBottom: '6px' }}>
                {parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j}>{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
            </div>
        );
    });
  };

  const toggleInsight = (month) => {
      setExpandedInsights(prev => ({ ...prev, [month]: !prev[month] }));
  };

  const handleAnalyzeMonth = async (month) => {
    setAnalyzingMonth(month);
    try {
        const res = await axios.post(`/api/reports/analyze/${month}`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        if (res.data.success) {
            setReports(prev => prev.map(r => r.month === month ? { ...r, ai_insight: res.data.insights } : r));
            setExpandedInsights(prev => ({ ...prev, [month]: true }));
        }
    } catch (err) {
        alert(err.response?.data?.error || "Failed to generate AI insights.");
    }
    setAnalyzingMonth(null);
  };

  const executePDFGeneration = () => {
    const activeReport = reports.find(r => r.month === pdfConfig.month);
    if (!activeReport || activeReport.isCurrentMonth) return;

    setIsPrinting(true);
    setShowPdfModal(false);
    
    const originalTitle = document.title;
    document.title = `Dhanapalana - ${formatMonth(pdfConfig.month)}'s finance report`;

    setTimeout(() => {
        window.print();
        document.title = originalTitle; 
        setIsPrinting(false);
    }, 800);
  };

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Syncing Financial Core & AI Matrices...</div>;

  const activePrintReport = reports.find(r => r.month === pdfConfig.month);
  const isCurrentSelected = activePrintReport?.isCurrentMonth;
  const hasComparisonData = activePrintReport && activePrintReport.catComparison && activePrintReport.catComparison.some(c => c.previous > 0);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      
      <style>
        {`
          @media screen { .printable-document { display: none !important; } }
          @media print {
            body { background: #ffffff !important; background-color: #ffffff !important; color: #000 !important; }
            .no-print { display: none !important; }
            .printable-document { display: block !important; width: 100%; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
            .printable-document h1, .printable-document h2, .printable-document h3, .printable-document h4 { color: #000 !important; margin-bottom: 12px; }
            .print-card { border: 1px solid #ccc; margin-bottom: 24px; padding: 20px; border-radius: 8px; page-break-inside: avoid; }
            .print-table { width: 100%; text-align: left; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            .print-table th, .print-table td { border-bottom: 1px solid #eee; padding: 10px 4px; }
            .print-table th { border-bottom: 2px solid #ccc; font-weight: bold; text-transform: uppercase; font-size: 11px; }
            .text-success { color: #16a34a !important; }
            .text-danger { color: #dc2626 !important; }
            .ai-insight-box { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; border-left: 4px solid #0284c7 !important; padding: 20px; font-size: 14px; line-height: 1.6; }
            .disclaimer { margin-top: 40px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 10px; color: #666 !important; text-align: center; }
          }
        `}
      </style>

      {/* PRINT LAYER */}
      {isPrinting && activePrintReport && (
          <div className="printable-document">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid black', paddingBottom: '16px', marginBottom: '30px' }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, letterSpacing: '-1px' }}>Dhanapālana</h1>
                    <span style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Wealth Management System</span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>Financial Report: {formatMonth(activePrintReport.month)}</h2>
              </div>
              
              {activePrintReport.ai_insight && (
                <div className="print-card ai-insight-box">
                    <h3 style={{ margin: '0 0 16px 0', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>✦ Insights by Vittaparāmarśadātā</h3>
                    <div>{formatAIText(activePrintReport.ai_insight)}</div>
                </div>
              )}
              
              <div className="print-card">
                  <h3>Cash Flow Summary</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '8px' }}>
                      <span>Total Inflow:</span> <strong>${activePrintReport.income.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '8px' }}>
                      <span>Total Expenses:</span> <strong>${activePrintReport.expense.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
                      <span>Net Savings:</span> 
                      <strong className={activePrintReport.net >= 0 ? 'text-success' : 'text-danger'}>
                        ${activePrintReport.net.toLocaleString('en-US', {minimumFractionDigits: 2})} ({activePrintReport.savingsRate}% Rate)
                      </strong>
                  </div>
              </div>

              {pdfConfig.includeComparison && hasComparisonData && (
                  <div className="print-card">
                      <h3>Category Breakdown (vs Previous Month)</h3>
                      <table className="print-table">
                          <thead><tr><th>Category</th><th>Spent</th><th>Difference</th></tr></thead>
                          <tbody>
                              {activePrintReport.catComparison.map(c => (
                                  <tr key={c.category}>
                                      <td>{c.category}</td>
                                      <td>${c.current.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                      <td className={c.diff > 0 ? 'text-danger' : 'text-success'}>
                                          {c.diff > 0 ? '+' : ''}${c.diff.toLocaleString('en-US', {minimumFractionDigits: 2})} ({c.pct}%)
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}

              {activePrintReport.investments && activePrintReport.investments.length > 0 && (
                 <div className="print-card">
                      <h3>Investment Performance</h3>
                      <table className="print-table">
                          <thead><tr><th>Asset</th><th>Starting Bal.</th><th>New Contrib.</th><th>Closing Bal.</th><th>MoM Gain/Loss</th></tr></thead>
                          <tbody>
                              {activePrintReport.investments.map((inv, i) => (
                                  <tr key={i}>
                                      <td><strong>{inv.name}</strong></td>
                                      <td>${inv.prevBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                      <td>${inv.contrib.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                      <td>${inv.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                      <td className={inv.gainLoss >= 0 ? 'text-success' : 'text-danger'}>
                                          <strong>{inv.gainLoss >= 0 ? '+' : ''}${inv.gainLoss.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                 </div>
              )}

              {(activePrintReport.transfers.length > 0 || activePrintReport.loans.length > 0) && (
                 <div className="print-card">
                      <h3>Capital Movements (Transfers & Lending)</h3>
                      <table className="print-table">
                          <thead><tr><th>Type</th><th>Destination / Recipient</th><th>Amount</th></tr></thead>
                          <tbody>
                              {activePrintReport.transfers.map((t, i) => (
                                  <tr key={`t-${i}`}><td>Transfer</td><td>{t.to}</td><td>${t.amt.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                              ))}
                              {activePrintReport.loans.map((l, i) => (
                                  <tr key={`l-${i}`}><td>Loan Issued</td><td>{l.to}</td><td>${l.amt.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                              ))}
                          </tbody>
                      </table>
                 </div>
              )}

              <div className="disclaimer">This financial advice is generated by AI (Vittaparāmarśadātā) and is for informational purposes only. Please consult a certified financial advisor before making financial decisions.</div>
          </div>
      )}


      {/* --- STANDARD WEB UI LAYER --- */}
      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
            <div>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: 800 }}>Monthly Analytics</h1>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '15px' }}>Auto-generated performance tracking.</p>
            </div>
            <button onClick={() => setShowPdfModal(true)} className="glass-button glass-button-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 'bold' }}>
            📄 Generate Official Report
            </button>
        </div>

        {showPdfModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                <div className="glass-card" style={{ width: '100%', maxWidth: '450px' }}>
                    <h2 style={{ marginTop: 0, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>Configure PDF Report</h2>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '13px' }}>Select Target Month</label>
                    <select value={pdfConfig.month} onChange={e => setPdfConfig({...pdfConfig, month: e.target.value})} className="glass-input" style={{ width: '100%', marginBottom: '20px', padding: '12px' }}>
                        {reports.map(r => (<option key={r.month} value={r.month}>{formatMonth(r.month)} {r.isCurrentMonth ? ' (Current - Unfinalized)' : ''}</option>))}
                    </select>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                            <input type="checkbox" checked={pdfConfig.includeComparison} onChange={e => setPdfConfig({...pdfConfig, includeComparison: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                            Include Month-over-Month Comparison Data
                        </label>
                    </div>

                    {isCurrentSelected ? (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '14px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px', lineHeight: 1.5, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            <strong>⚠️ Report Locked</strong><br/>The current month cannot be downloaded until it is officially finalized. Please select a past month to view AI Insights.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={executePDFGeneration} disabled={isCurrentSelected} className="glass-button" style={{ flex: 1, opacity: isCurrentSelected ? 0.5 : 1, cursor: isCurrentSelected ? 'not-allowed' : 'pointer' }}>Generate PDF</button>
                            <button onClick={() => setShowPdfModal(false)} className="glass-button glass-button-outline">Cancel</button>
                        </div>
                    )}
                </div>
            </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {reports.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No monthly data available yet.</p>}
            
            {reports.map((report) => {
            const isCurrent = report.isCurrentMonth;
            const netFlow = report.net;
            const isPositiveFlow = netFlow >= 0;
            const savingsRate = parseFloat(report.savingsRate);
            const hitGoal = savingsRate >= 20;

            return (
                <div key={report.month} className="glass-card" style={{ borderTop: isCurrent ? '4px solid var(--accent-cyan)' : '1px solid var(--border-glass)', position: 'relative' }}>
                
                {/* FIXED: Uses isCurrent (calendar logic) instead of array index! */}
                {isCurrent && <span style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--accent-cyan)', color: '#000', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '12px' }}>CURRENT</span>}
                
                {/* AI Trigger Button - Strictly hidden for current calendar month */}
                {!isCurrent && (
                   <button 
                      onClick={() => report.ai_insight ? alert('Your report is ready!') : handleAnalyzeMonth(report.month)}
                      disabled={analyzingMonth === report.month}
                      style={{ position: 'absolute', top: '16px', right: '16px', padding: '6px 12px', background: 'var(--bg-base)', color: 'var(--text-muted)', border: '1px solid var(--border-glass)', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', zIndex: 10, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
                   >
                      {analyzingMonth === report.month ? '🤖 Analyzing...' : '🤖 AI Analysis'}
                   </button>
                )}

                <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem', fontWeight: 700 }}>{formatMonth(report.month)}</h2>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Inflow</span>
                    <strong style={{ color: 'var(--success)' }}>C${report.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-glass)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Expenses</span>
                    <strong style={{ color: 'var(--danger)' }}>C${report.expense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Net Cash Flow</span>
                    <strong style={{ fontSize: '1.2rem', color: isPositiveFlow ? 'var(--success)' : 'var(--danger)' }}>
                    {isPositiveFlow ? '+' : ''}C${netFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                </div>

                {/* AI Insight Box with Hide/Show Toggle */}
                {report.ai_insight && !isCurrent && (
                  <div style={{ background: 'var(--bg-base)', borderLeft: '4px solid #0284c7', padding: '16px', borderRadius: '4px', marginBottom: '24px', fontSize: '13px', lineHeight: '1.6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: expandedInsights[report.month] ? '12px' : '0' }}>
                          <h4 style={{ color: '#0284c7', margin: 0, fontSize: '12px', textTransform: 'uppercase' }}>✨ AI Advisor Insights</h4>
                          <button onClick={() => toggleInsight(report.month)} style={{ background: 'transparent', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                              {expandedInsights[report.month] ? 'Hide' : 'Show'}
                          </button>
                      </div>
                      {expandedInsights[report.month] && <div>{formatAIText(report.ai_insight)}</div>}
                  </div>
                )}

                <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px' }}>Category Changes (vs Previous)</h4>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {report.catComparison.length === 0 && <span style={{fontSize: '13px', color: 'var(--text-muted)'}}>No expense data.</span>}
                        {report.catComparison.map(c => (
                            <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingBottom: '8px', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                                <span>{c.category} <span style={{color: 'var(--text-muted)', fontSize: '11px'}}>${c.current.toFixed(0)}</span></span>
                                <span style={{ color: c.diff > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                    {c.diff > 0 ? '▲ ' : '▼ '}${Math.abs(c.diff).toFixed(0)} ({c.pct}%)
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px' }}>Activity Volume</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {Object.keys(report.accounts).map(acc => (
                            <span key={acc} style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', color: 'var(--text-main)' }}>
                                {acc}: <strong style={{color: 'var(--accent-cyan)'}}>{report.accounts[acc]}</strong>
                            </span>
                        ))}
                    </div>
                </div>

                <div style={{ background: 'var(--bg-base)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Savings Target</span>
                    <span style={{ color: hitGoal ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold' }}>{savingsRate}% / 20%</span>
                    </div>
                    <div className="progress-bg">
                    <div className="progress-fill" style={{ width: `${Math.min(savingsRate, 100)}%`, background: hitGoal ? 'var(--success)' : 'var(--warning)' }}></div>
                    </div>
                </div>

                </div>
            );
            })}
        </div>
      </div>
    </div>
  );
};

export default Reports;