/**
 * Dhanapālana - Investment Portfolio Component
 * Investments.js - Investment Tracking and Management
 *
 * This component enables users to track their investment portfolio across different
 * asset types (stocks, bonds, mutual funds, ETFs, cryptocurrency). Users can log
 * investments, track valuations over time, and monitor portfolio performance.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { showConfirm } from './dialogService';

const ModalWrapper = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
    <div className="glass-card" style={{ width: '100%', maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(150,150,150,0.1)', boxSizing: 'border-box' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', opacity: 0.6 }}>✕</button>
      </div>
      <div style={{ padding: '24px', overflowY: 'auto', flex: 1, boxSizing: 'border-box' }}>
        {children}
      </div>
    </div>
  </div>
);

const Investments = () => {
  const [investments, setInvestments] = useState([]);
  const [banks, setBanks] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]); // NEW STATE
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState('');
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [investmentHistory, setInvestmentHistory] = useState([]);

  const [name, setName] = useState('');
  const [type, setType] = useState('Stock');
  const [bankId, setBankId] = useState('');
  const [accountTypeId, setAccountTypeId] = useState(''); // NEW STATE
  const [initialAmount, setInitialAmount] = useState('');

  const [logBalance, setLogBalance] = useState('');
  const [logContribution, setLogContribution] = useState('');
  const [logDate, setLogDate] = useState('');

  const API_URL = '/api';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setInvestments((await axios.get(`${API_URL}/investments`)).data);
      setBanks((await axios.get(`${API_URL}/banks`)).data);
      setAccountTypes((await axios.get(`${API_URL}/account-types`)).data); // FETCH ACCOUNT TYPES
    } catch (err) { console.error("Error fetching investments"); }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/investments`, { 
        name, 
        type, 
        bank_id: bankId || null, 
        account_type_id: accountTypeId || null, // SEND ACCOUNT TYPE
        initial_amount: parseFloat(initialAmount) || 0 
      });
      setIsAddModalOpen(false); 
      setName(''); setType('Stock'); setBankId(''); setAccountTypeId(''); setInitialAmount(''); 
      fetchData();
    } catch (err) { alert("Failed to add asset."); }
  };

  const openLogModal = (inv = null) => {
    if (inv) {
      setSelectedInvestmentId(inv.id.toString());
      setLogBalance(inv.current_balance || '');
    } else {
      setSelectedInvestmentId('');
      setLogBalance('');
    }
    setLogContribution('0');
    setLogDate(new Date().toISOString().split('T')[0]);
    setIsLogModalOpen(true);
  };

  const handleLogUpdate = async (e) => {
    e.preventDefault();
    if (!selectedInvestmentId) return alert("Please select an investment asset.");
    try {
      await axios.post(`${API_URL}/investment-logs`, { investment_id: selectedInvestmentId, date: logDate, balance: parseFloat(logBalance), net_contribution: parseFloat(logContribution) || 0 });
      setIsLogModalOpen(false); fetchData();
    } catch (err) { alert("Failed to log update."); }
  };

  const openHistoryModal = async (inv) => {
    try {
      const response = await axios.get(`${API_URL}/investments/${inv.id}/logs`);
      setSelectedInvestment(inv);
      setInvestmentHistory(response.data || []);
      setIsHistoryModalOpen(true);
    } catch (err) {
      alert('Failed to load investment history.');
    }
  };

  const handleDelete = async (id) => {
    if (!(await showConfirm("Permanently delete this investment profile?", { title: 'Delete Investment Asset' }))) return;
    try { await axios.delete(`${API_URL}/investments/${id}`); fetchData(); } 
    catch (err) { alert("Cannot delete asset."); }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: 800, letterSpacing: '-0.5px' }}>Investment Portfolio</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: '15px' }}>Track asset growth, contributions, and total net worth scaling.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => openLogModal()} className="glass-button" style={{ padding: '12px 20px', fontWeight: 'bold' }}>
            Manual Investment Performance
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="glass-button" style={{ padding: '12px 24px', fontWeight: 'bold', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
            + Add Asset
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {investments.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No investments active. Add your first asset.</div>
        ) : (
          investments.map(inv => {
            const bal = parseFloat(inv.current_balance || 0);
            const contrib = parseFloat(inv.total_contributed || 0);
            const profit = bal - contrib;
            const isProfit = profit >= 0;

            return (
              <div key={inv.id} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', borderTop: '4px solid #8b5cf6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem' }}>📈 {inv.name}</h3>
                    <p className="text-muted" style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {/* UPDATED: Now displays Account Type + Asset Type + Bank */}
                      {inv.account_type_name || 'Non-Reg'} • {inv.type} • {inv.bank_name || 'External'}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(inv.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', padding: '16px', background: 'rgba(150,150,150,0.05)', borderRadius: '12px' }}>
                  <div>
                    <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '11px', textTransform: 'uppercase' }}>Current Value</p>
                    <strong style={{ fontSize: '1.25rem' }}>C${bal.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '11px', textTransform: 'uppercase' }}>All-Time P/L</p>
                    <strong style={{ fontSize: '1.1rem', color: isProfit ? '#10b981' : '#ef4444' }}>{isProfit ? '+' : ''}C${profit.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                  </div>
                </div>

                <p className="text-muted" style={{ margin: '0 0 16px 0', fontSize: '12px' }}>
                  Last updated: {inv.last_log_date ? new Date(inv.last_log_date).toLocaleDateString('en-CA') : 'No logs yet'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button onClick={() => openLogModal(inv)} className="glass-button" style={{ width: '100%', padding: '12px', fontWeight: 'bold' }}>Update Value</button>
                  <button onClick={() => openHistoryModal(inv)} className="glass-button" style={{ width: '100%', padding: '12px', fontWeight: 'bold', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)', color: '#22d3ee' }}>Log Keeper</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isAddModalOpen && (
        <ModalWrapper title="Add New Asset" onClose={() => setIsAddModalOpen(false)}>
          <form onSubmit={handleAddAsset} style={{ display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Asset Name</label>
              <input type="text" placeholder="e.g., S&P 500 ETF, Bitcoin" value={name} onChange={e => setName(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }} />
            </div>
            
            <div style={{ display: 'flex', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Account Type</label>
                <select value={accountTypeId} onChange={e => setAccountTypeId(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>
                  <option value="">-- Optional (Non-Reg) --</option>
                  {/* POPULATES RRSP, TFSA, ETC FROM YOUR ADMIN PANEL */}
                  {accountTypes.map(act => ( <option key={act.id} value={act.id}>{act.name}</option> ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Asset Type</label>
                <select value={type} onChange={e => setType(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>
                  <option value="Stock">Stock/ETF</option><option value="Mutual Fund">Mutual Fund</option>
                  <option value="Crypto">Crypto</option><option value="Real Estate">Real Estate</option>
                </select>
              </div>
            </div>

            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Brokerage/Bank</label>
              <select value={bankId} onChange={e => setBankId(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>
                <option value="">-- Optional --</option>
                {banks.map(b => ( <option key={b.id} value={b.id}>{b.name}</option> ))}
              </select>
            </div>

            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Initial Deposit (CAD)</label>
              <input type="number" step="0.01" placeholder="0.00" value={initialAmount} onChange={e => setInitialAmount(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" className="glass-button" style={{ width: '100%', padding: '14px', marginTop: '10px', fontWeight: 'bold', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.2)', boxSizing: 'border-box' }}>Mint Asset</button>
          </form>
        </ModalWrapper>
      )}

      {/* Manual Logging Modal (Unchanged) */}
      {isLogModalOpen && (
        <ModalWrapper title="Manual Investment Performance" onClose={() => setIsLogModalOpen(false)}>
          <form onSubmit={handleLogUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '16px', borderRadius: '8px', marginBottom: '8px', boxSizing: 'border-box' }}>
              <p className="text-muted" style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>Log your monthly performance. Enter the new total balance, and any new money you contributed this month.</p>
            </div>
            
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Select Asset *</label>
              <select value={selectedInvestmentId} onChange={e => {
                setSelectedInvestmentId(e.target.value);
                const inv = investments.find(i => i.id.toString() === e.target.value);
                if (inv) setLogBalance(inv.current_balance || '');
              }} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>
                <option value="">-- Choose an Investment --</option>
                {investments.map(inv => ( <option key={inv.id} value={inv.id}>{inv.name}</option> ))}
              </select>
            </div>

            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>New Total Balance</label>
              <input type="number" step="0.01" value={logBalance} onChange={e => setLogBalance(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', fontSize: '1.2rem', fontWeight: 'bold', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>New Contribution (CAD)</label>
                <input type="number" step="0.01" value={logContribution} onChange={e => setLogContribution(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Date</label>
                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <button type="submit" className="glass-button" style={{ width: '100%', padding: '14px', marginTop: '10px', fontWeight: 'bold', boxSizing: 'border-box' }}>Save Performance Log</button>
          </form>
        </ModalWrapper>
      )}

      {isHistoryModalOpen && (
        <ModalWrapper title={`Log Keeper${selectedInvestment ? ` - ${selectedInvestment.name}` : ''}`} onClose={() => setIsHistoryModalOpen(false)}>
          {investmentHistory.length === 0 ? (
            <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No historical logs found for this investment.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {investmentHistory.map((log, index) => {
                const previous = investmentHistory[index + 1];
                const delta = previous ? (parseFloat(log.balance) - parseFloat(previous.balance)) : 0;
                const isUp = delta >= 0;
                return (
                  <div key={log.id} className="glass-card" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '14px' }}>{new Date(log.date).toLocaleDateString('en-CA')}</strong>
                      <span style={{ fontSize: '12px', color: isUp ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                        {index === investmentHistory.length - 1 ? 'Initial Entry' : `${isUp ? '+' : ''}C$${delta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '11px', textTransform: 'uppercase' }}>Portfolio Value</p>
                        <strong>C${parseFloat(log.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div>
                        <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '11px', textTransform: 'uppercase' }}>Contribution</p>
                        <strong style={{ color: parseFloat(log.net_contribution || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                          {parseFloat(log.net_contribution || 0) >= 0 ? '+' : ''}C${parseFloat(log.net_contribution || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ModalWrapper>
      )}
    </div>
  );
};

export default Investments;