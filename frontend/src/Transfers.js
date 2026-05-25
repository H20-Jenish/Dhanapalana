/**
 * Dhanapālana - Money Transfer Component
 * Transfers.js - Inter-Account and External Transfers
 *
 * This component manages money transfers between accounts, to external recipients,
 * and handling of different transfer methods (E-Transfer, bank transfer, credit card
 * repayment). It tracks transfer history and provides flexible payment routing.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

const Transfers = () => {
  const [transfers, setTransfers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [recipientBanks, setRecipientBanks] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [sourceAccountId, setSourceAccountId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientBankId, setRecipientBankId] = useState('');
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState('1.00');
  const [method, setMethod] = useState('E-Transfer');
  const [date, setDate] = useState('');

  const API_URL = '/api';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setTransfers((await axios.get(`${API_URL}/transfers`)).data.filter(t => t.status !== 'DELETED'));
      setAccounts((await axios.get(`${API_URL}/savings`)).data);
      setRecipientBanks((await axios.get(`${API_URL}/recipient-banks`)).data);
    } catch (err) { console.error(err); }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingId(item.id); setSourceAccountId(item.source_account_id || ''); setRecipient(item.recipient);
      setRecipientBankId(item.recipient_bank_id || ''); setAmount(item.amount); setExchangeRate(item.exchange_rate);
      setMethod(item.method); setDate(item.date ? item.date.split('T')[0] : '');
    } else {
      setEditingId(null); setSourceAccountId(''); setRecipient(''); setRecipientBankId('');
      setAmount(''); setExchangeRate('1.00'); setMethod('E-Transfer'); setDate(new Date().toISOString().split('T')[0]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { source_account_id: sourceAccountId || null, recipient, recipient_bank_id: recipientBankId || null, amount: parseFloat(amount), exchange_rate: parseFloat(exchangeRate), method, date };
    try {
      if (editingId) await axios.put(`${API_URL}/transfers/${editingId}`, payload);
      else await axios.post(`${API_URL}/transfers`, payload);
      setIsModalOpen(false); fetchData();
    } catch (err) { alert("Error saving transfer."); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transfer? Funds will be returned to the source account.")) return;
    try { await axios.delete(`${API_URL}/transfers/${id}`); fetchData(); } 
    catch (err) { alert("Error deleting transfer."); }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: 800, letterSpacing: '-0.5px' }}>External Transfers</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: '15px' }}>Log outbound remittances and third-party fund routing.</p>
        </div>
        <button onClick={() => openModal()} className="glass-button" style={{ padding: '12px 24px', fontWeight: 'bold', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          + Send Funds
        </button>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {transfers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No transfers found.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {transfers.map(t => (
              <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(150,150,150,0.1)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(150,150,150,0.03)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <strong style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    To: {t.recipient}
                    <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(150,150,150,0.1)', borderRadius: '12px', fontWeight: 'bold' }}>{t.method}</span>
                  </strong>
                  <span className="text-muted" style={{ fontSize: '13px' }}>{t.date ? new Date(t.date).toLocaleDateString() : ''} • Bank: {t.recipient_bank || 'Unspecified'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '1.1rem', color: '#f59e0b', display: 'block' }}>- C${parseFloat(t.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                    {parseFloat(t.exchange_rate) !== 1 && <small className="text-muted">₹{parseFloat(t.inr_amount).toLocaleString('en-IN', {maximumFractionDigits: 0})}</small>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => openModal(t)} className="glass-button glass-button-warning" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>Edit</button>
                    <button onClick={() => handleDelete(t.id)} className="glass-button glass-button-danger" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isModalOpen && (
        <ModalWrapper title={editingId ? "Edit Transfer" : "Initialize Transfer"} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Recipient Name *</label>
                <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Destination Bank</label>
                <select value={recipientBankId} onChange={e => setRecipientBankId(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px' }}>
                  <option value="">-- Optional --</option>
                  {recipientBanks.map(b => ( <option key={b.id} value={b.id}>{b.name}</option> ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Source Account (Withdraw From)</label>
              <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px' }}>
                <option value="">-- Cash / External --</option>
                {accounts.map(acc => ( <option key={acc.id} value={acc.id}>{acc.bank_name} {acc.account_type ? `(${acc.account_type})` : ''} - Bal: C${parseFloat(acc.balance).toFixed(2)}</option> ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Amount (CAD) *</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px', fontSize: '1.1rem', fontWeight: 'bold' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>FX Rate</label>
                <input type="number" step="0.01" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Method</label>
                <select value={method} onChange={e => setMethod(e.target.value)} className="glass-input" style={{ width: '100%', padding: '12px' }}>
                  <option value="E-Transfer">E-Transfer</option><option value="Wire Transfer">Wire Transfer</option><option value="Remitly/Wise">Remitly / Wise</option><option value="Cash">Cash</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px' }} />
              </div>
            </div>

            <button type="submit" className="glass-button" style={{ width: '100%', padding: '14px', marginTop: '10px', fontWeight: 'bold', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              {editingId ? "Update Transfer" : "Execute Transfer"}
            </button>
          </form>
        </ModalWrapper>
      )}
    </div>
  );
};

export default Transfers;