/**
 * Dhanapālana - Credit Card Management Component
 * Credit.js - Credit Card Tracking and Repayment
 *
 * This component manages the user's credit cards, tracking balances, credit limits,
 * and facilitating credit card repayment from linked bank accounts. It provides
 * visibility into credit utilization and enables easy payment management.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- UNIFIED PREMIUM MODAL WRAPPER ---
const ModalWrapper = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
    <div className="glass-card" style={{ width: '100%', maxWidth: '450px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
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

const Credit = () => {
  const [creditCards, setCreditCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayAccountId, setRepayAccountId] = useState('');
  const [repayDate, setRepayDate] = useState('');

  const API_URL = '/api';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setCreditCards((await axios.get(`${API_URL}/credit-cards`)).data);
      setAccounts((await axios.get(`${API_URL}/savings`)).data);
    } catch (err) { console.error("Error fetching data"); }
  };

  const openRepayModal = (card) => {
    setSelectedCard(card);
    setRepayAmount(card.balance); 
    setRepayAccountId('');
    setRepayDate(new Date().toISOString().split('T')[0]);
    setIsRepayModalOpen(true);
  };

  const handleRepay = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/credit-cards/${selectedCard.id}/repay`, { account_id: repayAccountId || null, amount: parseFloat(repayAmount), date: repayDate || null });
      setIsRepayModalOpen(false); fetchData();
      alert(`Successfully registered C$${repayAmount} repayment to ${selectedCard.name}.`);
    } catch (err) { alert("Repayment logging failed."); }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: 800, letterSpacing: '-0.5px' }}>Credit Utilization</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: '15px' }}>Monitor outstanding debts and log credit statement payments.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
        {creditCards.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No credit cards have been configured. Add them in the Admin Panel.</div>
        ) : (
          creditCards.map(card => {
            const limit = parseFloat(card.limit_amount) || 0;
            const balance = parseFloat(card.balance) || 0;
            const utilization = limit > 0 ? Math.min((balance / limit) * 100, 100) : 0;
            
            let utilColor = '#10b981'; 
            if (utilization > 30) utilColor = '#f59e0b'; 
            if (utilization > 70) utilColor = '#ef4444'; 

            return (
              <div key={card.id} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>💳 {card.name}</h3>
                    <p className="text-muted" style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Credit Card</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '12px' }}>Current Balance</p>
                    <strong style={{ fontSize: '1.5rem', color: balance > 0 ? '#ef4444' : 'inherit' }}>C${balance.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                    <span className="text-muted">Utilization: {utilization.toFixed(1)}%</span>
                    <span className="text-muted">Limit: C${limit.toLocaleString('en-US', {minimumFractionDigits: 0})}</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(150,150,150,0.15)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${utilization}%`, background: utilColor, transition: 'width 0.5s ease-in-out', borderRadius: '4px' }}></div>
                  </div>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  <button onClick={() => openRepayModal(card)} className="glass-button" style={{ width: '100%', padding: '12px', fontWeight: 'bold' }}>Log Repayment</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isRepayModalOpen && selectedCard && (
        <ModalWrapper title={`Repay ${selectedCard.name}`} onClose={() => setIsRepayModalOpen(false)}>
          <form onSubmit={handleRepay} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Payment Source (Withdraw From)</label>
              <select value={repayAccountId} onChange={e => setRepayAccountId(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px' }}>
                <option value="">-- Cash / External Source --</option>
                {accounts.map(acc => ( <option key={acc.id} value={acc.id}>{acc.bank_name} {acc.account_type ? `(${acc.account_type})` : ''} - Bal: C${parseFloat(acc.balance).toFixed(2)}</option> ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Payment Amount</label>
                <input type="number" step="0.01" min="0.01" value={repayAmount} onChange={e => setRepayAmount(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', fontSize: '1.1rem', fontWeight: 'bold' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Date Paid</label>
                <input type="date" value={repayDate} onChange={e => setRepayDate(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px' }} />
              </div>
            </div>

            <button type="submit" className="glass-button" style={{ width: '100%', padding: '14px', marginTop: '10px', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              Confirm Payment
            </button>
          </form>
        </ModalWrapper>
      )}

    </div>
  );
};

export default Credit;