/**
 * Dhanap\u0101lana - Data Management Component
 * DataManagement.js - Master Data Configuration and Administration
 *
 * This component provides administrative functions for managing master data including
 * expense categories, income sources, account definitions, investment types, and other
 * system configuration data. It allows users to customize their financial system setup.
 *
 * KEY FEATURES:
 * - Expense category management (add, edit, delete)
 * - Income source type configuration
 * - Account definitions and properties
 * - Investment type definitions
 * - Credit card issuer management
 * - Lending party configuration
 * - Transfer method setup
 * - Custom field definitions
 * - Data type validation
 * - Icon and color customization
 * - Default value configuration
 * - Bulk import/export capabilities
 * - System-wide data consistency
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { showConfirm, showPrompt } from './dialogService';

// --- PREMIUM SVG ICONS ---
const IconFolder = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>;
const IconBank = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>;
const IconTag = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const IconCreditCard = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
const IconRoute = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>;

const ModalWrapper = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
    <div className="glass-card" style={{ width: '100%', maxWidth: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(150,150,150,0.1)' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', opacity: 0.6 }}>✕</button>
      </div>
      <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>{children}</div>
    </div>
  </div>
);

const AdminCard = ({ icon, title, description, accentColor, onClick }) => (
  <div onClick={onClick} className="glass-card" style={{ cursor: 'pointer', textAlign: 'left', borderTop: `4px solid ${accentColor}`, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <div style={{ color: accentColor }}>{icon}</div>
    <div>
      <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 600 }}>{title}</h3>
      <p className="text-muted" style={{ fontSize: '13px', margin: 0, lineHeight: 1.4 }}>{description}</p>
    </div>
  </div>
);

const DataManagement = () => {
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [recipientBanks, setRecipientBanks] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [typeOfAssets, setTypeOfAssets] = useState([]);
  const [investmentTypes, setInvestmentTypes] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [draggingCategoryId, setDraggingCategoryId] = useState(null);
  const [hoveredCategoryId, setHoveredCategoryId] = useState(null);
  const categoryOrderSnapshotRef = useRef([]);
  const categoryDropHandledRef = useRef(false);
  
  const [newCategory, setNewCategory] = useState('');
  const [newBank, setNewBank] = useState('');
  const [newRecipBank, setNewRecipBank] = useState('');
  const [newAccountType, setNewAccountType] = useState('');
  const [newTypeOfAsset, setNewTypeOfAsset] = useState('');
  const [newInvestmentType, setNewInvestmentType] = useState('');
  
  const [activeModal, setActiveModal] = useState(null); 
  const [error, setError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const API_URL = '/api';
  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setCategories((await axios.get(`${API_URL}/categories`)).data);
      setBanks((await axios.get(`${API_URL}/banks`)).data);
      setRecipientBanks((await axios.get(`${API_URL}/recipient-banks`)).data);
      setAccountTypes((await axios.get(`${API_URL}/account-types`)).data);
      setTypeOfAssets((await axios.get(`${API_URL}/type-of-assets`)).data);
      setInvestmentTypes((await axios.get(`${API_URL}/investment-types`)).data);
      setCreditCards((await axios.get(`${API_URL}/credit-cards`)).data);
    } catch (err) { setError("Access Denied: You must be an Administrator."); }
  };

  const handleAdd = async (e, endpoint, name, setter) => { 
    e.preventDefault(); 
    try { await axios.post(`${API_URL}/${endpoint}`, { name }, getAuthHeaders()); setter(''); fetchData(); } 
    catch (err) { alert("Error adding item"); } 
  };

  const handleEdit = async (endpoint, id, currentName, forceUpper = false) => { 
    let newName = await showPrompt("Edit Name:", { title: 'Edit Item', defaultValue: currentName }); 
    if (!newName || newName.trim() === '') return; 
    if (forceUpper) newName = newName.toUpperCase(); 
    try { await axios.put(`${API_URL}/${endpoint}/${id}`, { name: newName }, getAuthHeaders()); fetchData(); } 
    catch (err) { alert("Error updating item"); } 
  };

  const handleDelete = async (endpoint, id) => { 
    if (!(await showConfirm("Are you sure you want to delete this?", { title: 'Confirm Delete' }))) return; 
    try { await axios.delete(`${API_URL}/${endpoint}/${id}`, getAuthHeaders()); fetchData(); } 
    catch (err) { alert("Cannot delete item in use."); } 
  };

  const handleCategoryDragStart = (id) => {
    categoryOrderSnapshotRef.current = categories;
    categoryDropHandledRef.current = false;
    setDraggingCategoryId(id);
  };

  const handleCategoryDragOver = (e, id) => {
    e.preventDefault();
    if (draggingCategoryId !== id) setHoveredCategoryId(id);
  };

  const handleCategoryDragEnter = (targetId) => {
    if (!draggingCategoryId || draggingCategoryId === targetId) return;

    setCategories((current) => {
      const next = [...current];
      const fromIndex = next.findIndex((item) => item.id === draggingCategoryId);
      const toIndex = next.findIndex((item) => item.id === targetId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return current;

      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setHoveredCategoryId(targetId);
  };

  const handleCategoryDrop = async (targetId) => {
    if (!draggingCategoryId) return;

    categoryDropHandledRef.current = true;
    const next = [...categories];

    try {
      await axios.post(`${API_URL}/categories/reorder`, { categoryIds: next.map(item => item.id) }, getAuthHeaders());
    } catch (err) {
      alert('Unable to save category order.');
      fetchData();
    } finally {
      setDraggingCategoryId(null);
      setHoveredCategoryId(null);
      categoryOrderSnapshotRef.current = [];
    }
  };

  const handleCategoryDragEnd = () => {
    if (!categoryDropHandledRef.current && categoryOrderSnapshotRef.current.length > 0) {
      setCategories(categoryOrderSnapshotRef.current);
    }
    setDraggingCategoryId(null);
    setHoveredCategoryId(null);
    categoryOrderSnapshotRef.current = [];
    categoryDropHandledRef.current = false;
  };

  const handleAddCredit = async (e) => { 
    e.preventDefault(); 
    const name = await showPrompt("Enter new Credit Card name (e.g., AMEX):", { title: 'Add Credit Card' }); if (!name) return; 
    const limit = await showPrompt("Enter Credit Limit (CAD):", { title: 'Add Credit Card', defaultValue: '0.00' }); if (!limit || isNaN(limit)) return alert("Invalid limit"); 
    try { await axios.post(`${API_URL}/credit-cards`, { name: name.toUpperCase(), limit_amount: limit }, getAuthHeaders()); fetchData(); } 
    catch (err) { alert("Error adding credit card"); } 
  };

  const handleEditCredit = async (id, currentName, currentLimit) => { 
    let newName = await showPrompt("Edit Card Name:", { title: 'Edit Credit Card', defaultValue: currentName }); if (!newName) return; 
    let newLimit = await showPrompt("Edit Credit Limit (CAD):", { title: 'Edit Credit Card', defaultValue: String(currentLimit) }); if (!newLimit || isNaN(newLimit)) return; 
    try { await axios.put(`${API_URL}/credit-cards/${id}`, { name: newName.toUpperCase(), limit_amount: newLimit }, getAuthHeaders()); fetchData(); } 
    catch (err) { alert("Error updating card"); } 
  };

  const handleSoftReset = async () => {
    if (!(await showConfirm("⚠️ WARNING: This will delete ALL transactions, incomes, expenses, investments, and generated insights. Account balances will be reset to $0.\n\nYour categories, banks, settings, and users WILL BE SAVED.\n\nAre you sure you want to proceed?", { title: 'Confirm Soft Reset' }))) return;
    setIsResetting(true);
    try {
      await axios.post(`${API_URL}/system/soft-reset`, {}, getAuthHeaders());
      alert("🧹 Soft reset complete! All transactional data has been wiped.");
      window.location.reload();
    } catch (err) { alert("Failed to soft reset system."); setIsResetting(false); }
  };

  if (error) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '30px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'center' }}><h2 style={{ color: '#ef4444', margin: '0 0 10px 0' }}>Access Denied</h2><p style={{ color: '#64748b', margin: 0 }}>You must be an Administrator to view this panel.</p></div></div>;

  const renderList = (data, endpoint, forceUpper) => (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {data.map(item => (
        <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid rgba(150,150,150,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <button
              type="button"
              draggable={endpoint === 'categories'}
              onDragStart={() => handleCategoryDragStart(item.id)}
              onDragEnd={handleCategoryDragEnd}
              onMouseDown={() => handleCategoryDragStart(item.id)}
              className="glass-button"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                display: endpoint === 'categories' ? 'flex' : 'none',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: 'grab',
                flexShrink: 0,
              }}
              aria-label={`Reorder ${item.name}`}
              title="Drag to reorder"
            >
              <span style={{ display: 'grid', gap: '3px' }}>
                <span style={{ width: '14px', height: '2px', borderRadius: '999px', background: 'currentColor', opacity: 0.7 }} />
                <span style={{ width: '14px', height: '2px', borderRadius: '999px', background: 'currentColor', opacity: 0.7 }} />
                <span style={{ width: '14px', height: '2px', borderRadius: '999px', background: 'currentColor', opacity: 0.7 }} />
              </span>
            </button>
            <span style={{ fontWeight: 500, fontSize: '15px', wordBreak: 'break-word' }}>{item.name}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => handleEdit(endpoint, item.id, item.name, forceUpper)} className="glass-button glass-button-warning" style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px' }}>Edit</button>
            <button onClick={() => handleDelete(endpoint, item.id)} className="glass-button glass-button-danger" style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px' }}>Delete</button>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: 800, letterSpacing: '-0.5px' }}>Data Management</h1>
        <p className="text-muted" style={{ margin: 0, fontSize: '15px' }}>Configure your structural definitions and system schemas.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <AdminCard icon={<IconFolder />} title="Categories" description={`${categories.length} active spending categories.`} accentColor="#8b5cf6" onClick={() => setActiveModal('categories')} />
        <AdminCard icon={<IconBank />} title="My Banks" description={`${banks.length} financial institutions configured.`} accentColor="#14b8a6" onClick={() => setActiveModal('banks')} />
        <AdminCard icon={<IconTag />} title="Account Types" description={`${accountTypes.length} ledger types (e.g. Checking).`} accentColor="#ec4899" onClick={() => setActiveModal('accountTypes')} />
        <AdminCard icon={<IconTag />} title="Type of Asset" description={`${typeOfAssets.length} registered asset wrappers (FHSA/TFSA/etc.).`} accentColor="#0ea5e9" onClick={() => setActiveModal('typeOfAssets')} />
        <AdminCard icon={<IconTag />} title="Investment Type" description={`${investmentTypes.length} investment classes (Stocks/ETFs/Crypto/etc.).`} accentColor="#22c55e" onClick={() => setActiveModal('investmentTypes')} />
        <AdminCard icon={<IconCreditCard />} title="Credit Cards" description={`${creditCards.length} active credit configurations.`} accentColor="#f43f5e" onClick={() => setActiveModal('creditCards')} />
        <AdminCard icon={<IconRoute />} title="Recipient Banks" description={`${recipientBanks.length} external routing destinations.`} accentColor="#6366f1" onClick={() => setActiveModal('recipientBanks')} />
      </div>

      <div className="glass-card" style={{ maxWidth: '400px', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ color: '#f59e0b', margin: '0 0 8px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>🧹 Soft Reset</h3>
          <p className="text-muted" style={{ margin: 0, fontSize: '14px' }}>Clear all transactional data and reset balances to zero. Keeps categories, accounts, and users intact.</p>
        </div>
        <button onClick={handleSoftReset} disabled={isResetting} className="glass-button glass-button-warning" style={{ padding: '14px 28px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          {isResetting ? 'PROCESSING...' : 'PERFORM SOFT RESET'}
        </button>
      </div>

      {activeModal === 'categories' && (
        <ModalWrapper title="Manage Categories" onClose={() => setActiveModal(null)}>
          <form onSubmit={(e) => handleAdd(e, 'categories', newCategory, setNewCategory)} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input type="text" placeholder="e.g., Groceries, Utilities" value={newCategory} onChange={e => setNewCategory(e.target.value)} required className="glass-input" style={{ flex: 1 }} />
            <button type="submit" className="glass-button" style={{ padding: '0 24px' }}>Add</button>
          </form>
          <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Drag the handle to reorder categories. Reports follow this same order.</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {categories.map((item) => (
              <li
                key={item.id}
                onDragOver={(e) => handleCategoryDragOver(e, item.id)}
                onDragEnter={() => handleCategoryDragEnter(item.id)}
                onDrop={() => handleCategoryDrop(item.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 0',
                  borderBottom: '1px solid rgba(150,150,150,0.1)',
                  background: hoveredCategoryId === item.id ? 'rgba(255,255,255,0.03)' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <button
                    type="button"
                    draggable
                    onDragStart={() => handleCategoryDragStart(item.id)}
                    onDragEnd={handleCategoryDragEnd}
                    className="glass-button"
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      cursor: 'grab',
                      flexShrink: 0,
                    }}
                    aria-label={`Drag ${item.name} to reorder`}
                    title="Drag to reorder"
                  >
                    <span style={{ display: 'grid', gap: '3px' }}>
                      <span style={{ width: '14px', height: '2px', borderRadius: '999px', background: 'currentColor', opacity: 0.7 }} />
                      <span style={{ width: '14px', height: '2px', borderRadius: '999px', background: 'currentColor', opacity: 0.7 }} />
                      <span style={{ width: '14px', height: '2px', borderRadius: '999px', background: 'currentColor', opacity: 0.7 }} />
                    </span>
                  </button>
                  <span style={{ fontWeight: 500, fontSize: '15px', wordBreak: 'break-word' }}>{item.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleEdit('categories', item.id, item.name, false)} className="glass-button glass-button-warning" style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px' }}>Edit</button>
                  <button onClick={() => handleDelete('categories', item.id)} className="glass-button glass-button-danger" style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px' }}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </ModalWrapper>
      )}

      {activeModal === 'banks' && (
        <ModalWrapper title="Manage Banks" onClose={() => setActiveModal(null)}>
          <form onSubmit={(e) => handleAdd(e, 'banks', newBank, setNewBank)} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input type="text" placeholder="e.g., CIBC, TD" value={newBank} onChange={e => setNewBank(e.target.value.toUpperCase())} required className="glass-input" style={{ flex: 1 }} />
            <button type="submit" className="glass-button" style={{ padding: '0 24px' }}>Add</button>
          </form>
          {renderList(banks, 'banks', true)}
        </ModalWrapper>
      )}

      {activeModal === 'accountTypes' && (
        <ModalWrapper title="Manage Account Types" onClose={() => setActiveModal(null)}>
          <form onSubmit={(e) => handleAdd(e, 'account-types', newAccountType, setNewAccountType)} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input type="text" placeholder="e.g., Checking, Savings" value={newAccountType} onChange={e => setNewAccountType(e.target.value)} required className="glass-input" style={{ flex: 1 }} />
            <button type="submit" className="glass-button" style={{ padding: '0 24px' }}>Add</button>
          </form>
          {renderList(accountTypes, 'account-types', false)}
        </ModalWrapper>
      )}

      {activeModal === 'typeOfAssets' && (
        <ModalWrapper title="Manage Type of Asset" onClose={() => setActiveModal(null)}>
          <form onSubmit={(e) => handleAdd(e, 'type-of-assets', newTypeOfAsset, setNewTypeOfAsset)} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input type="text" placeholder="e.g., FHSA, TFSA, RRSP" value={newTypeOfAsset} onChange={e => setNewTypeOfAsset(e.target.value)} required className="glass-input" style={{ flex: 1 }} />
            <button type="submit" className="glass-button" style={{ padding: '0 24px' }}>Add</button>
          </form>
          {renderList(typeOfAssets, 'type-of-assets', false)}
        </ModalWrapper>
      )}

      {activeModal === 'investmentTypes' && (
        <ModalWrapper title="Manage Investment Types" onClose={() => setActiveModal(null)}>
          <form onSubmit={(e) => handleAdd(e, 'investment-types', newInvestmentType, setNewInvestmentType)} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input type="text" placeholder="e.g., Stocks/ETFs, Crypto" value={newInvestmentType} onChange={e => setNewInvestmentType(e.target.value)} required className="glass-input" style={{ flex: 1 }} />
            <button type="submit" className="glass-button" style={{ padding: '0 24px' }}>Add</button>
          </form>
          {renderList(investmentTypes, 'investment-types', false)}
        </ModalWrapper>
      )}

      {activeModal === 'recipientBanks' && (
        <ModalWrapper title="Manage Recipient Banks" onClose={() => setActiveModal(null)}>
          <form onSubmit={(e) => handleAdd(e, 'recipient-banks', newRecipBank, setNewRecipBank)} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input type="text" placeholder="e.g., HDFC" value={newRecipBank} onChange={e => setNewRecipBank(e.target.value.toUpperCase())} required className="glass-input" style={{ flex: 1 }} />
            <button type="submit" className="glass-button" style={{ padding: '0 24px' }}>Add</button>
          </form>
          {renderList(recipientBanks, 'recipient-banks', true)}
        </ModalWrapper>
      )}

      {activeModal === 'creditCards' && (
        <ModalWrapper title="Manage Credit Cards" onClose={() => setActiveModal(null)}>
          <button onClick={handleAddCredit} className="glass-button" style={{ width: '100%', marginBottom: '24px', padding: '14px' }}>+ Mint New Credit Card</button>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {creditCards.map(cc => (
              <li key={cc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid rgba(150,150,150,0.1)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: '16px' }}>{cc.name}</strong> 
                  <small className="text-muted">Limit: C${parseFloat(cc.limit_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</small>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleEditCredit(cc.id, cc.name, cc.limit_amount)} className="glass-button glass-button-warning" style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px' }}>Edit</button>
                  <button onClick={() => handleDelete('credit-cards', cc.id)} className="glass-button glass-button-danger" style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px' }}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </ModalWrapper>
      )}
    </div>
  );
};

export default DataManagement;