import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { showConfirm } from './dialogService';

const ModalWrapper = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
    <div className="glass-card" style={{ width: '100%', maxWidth: '1020px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid rgba(150,150,150,0.1)', boxSizing: 'border-box' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'inherit', opacity: 0.7, width: '32px', height: '32px', borderRadius: '8px' }}>✕</button>
      </div>
      <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, boxSizing: 'border-box' }}>
        {children}
      </div>
    </div>
  </div>
);

const emptyStockRow = (id) => ({ id, ticker: '', amount: '', unitPrice: '', quantity: '', loading: false, error: '' });
const todayDate = () => new Date().toISOString().split('T')[0];
const formatCurrency = (value) => `C$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;
const formatShares = (value) => Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 });
const toPrettyLabel = (raw) => String(raw || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const Investments = () => {
  const API_URL = '/api';

  const [investments, setInvestments] = useState([]);
  const [banks, setBanks] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [typeOfAssets, setTypeOfAssets] = useState([]);
  const [investmentTypes, setInvestmentTypes] = useState([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isHoldingsModalOpen, setIsHoldingsModalOpen] = useState(false);

  const [selectedInvestmentId, setSelectedInvestmentId] = useState('');
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [investmentTimeline, setInvestmentTimeline] = useState([]);
  const [selectedHoldings, setSelectedHoldings] = useState([]);

  const [typeOfAssetId, setTypeOfAssetId] = useState('');
  const [investmentTypeId, setInvestmentTypeId] = useState('');
  const [bankId, setBankId] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [assetDate, setAssetDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialAmount, setInitialAmount] = useState('');
  const [stocks, setStocks] = useState([emptyStockRow(1)]);
  const [isSaving, setIsSaving] = useState(false);
  const [stockHoldingsByInvestmentId, setStockHoldingsByInvestmentId] = useState({});
  const [stockHoldingsLoadingByInvestmentId, setStockHoldingsLoadingByInvestmentId] = useState({});

  const [logBalance, setLogBalance] = useState('');
  const [logContribution, setLogContribution] = useState('');
  const [logDate, setLogDate] = useState('');

  const [isStockUpdateModalOpen, setIsStockUpdateModalOpen] = useState(false);
  const [stockUpdateInvestment, setStockUpdateInvestment] = useState(null);
  const [stockUpdateType, setStockUpdateType] = useState('DIVIDEND_REINVESTMENT');
  const [stockUpdateTicker, setStockUpdateTicker] = useState('');
  const [stockUpdateDate, setStockUpdateDate] = useState(todayDate());
  const [stockUpdateAmount, setStockUpdateAmount] = useState('');
  const [stockUpdateUnitPrice, setStockUpdateUnitPrice] = useState('');
  const [stockUpdateShares, setStockUpdateShares] = useState('');
  const [isStockUpdateSaving, setIsStockUpdateSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const isStockInvestment = (inv) => (String(inv?.investment_type_name || inv?.type || '').toLowerCase() === 'stocks/etfs');

  const stockInvestmentIds = useMemo(
    () => investments.filter((inv) => isStockInvestment(inv)).map((inv) => Number(inv.id)),
    [investments]
  );

  useEffect(() => {
    let isCancelled = false;

    const refreshLiveValues = async () => {
      try {
        const response = await axios.get(`${API_URL}/investments/live-values`);
        const values = response.data?.values || [];
        if (!Array.isArray(values) || values.length === 0 || isCancelled) return;

        const valueMap = new Map(values.map((v) => [Number(v.investment_id), v]));
        setInvestments((current) => current.map((inv) => {
          const live = valueMap.get(Number(inv.id));
          if (!live) return inv;
          return {
            ...inv,
            current_balance: live.live_balance,
            last_log_date: live.priced_at ? String(live.priced_at).split('T')[0] : inv.last_log_date,
            live_price_source: live.source,
          };
        }));
      } catch (err) {}
    };

    refreshLiveValues();
    const intervalId = setInterval(refreshLiveValues, 1000);
    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const refreshStockHoldingsForIds = async (investmentIds = []) => {
    if (!Array.isArray(investmentIds) || investmentIds.length === 0) {
      setStockHoldingsByInvestmentId({});
      return;
    }

    setStockHoldingsLoadingByInvestmentId((current) => {
      const next = { ...current };
      investmentIds.forEach((id) => { next[id] = true; });
      return next;
    });

    const rows = await Promise.all(investmentIds.map(async (id) => {
      try {
        const response = await axios.get(`${API_URL}/investments/${id}/holdings/live`);
        return [id, response.data?.holdings || []];
      } catch (err) {
        return [id, []];
      }
    }));

    setStockHoldingsByInvestmentId((current) => {
      const next = { ...current };
      rows.forEach(([id, holdings]) => {
        next[id] = holdings;
      });
      return next;
    });

    setStockHoldingsLoadingByInvestmentId((current) => {
      const next = { ...current };
      investmentIds.forEach((id) => { next[id] = false; });
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    const ids = [...stockInvestmentIds];
    if (ids.length === 0) return undefined;

    const refresh = async () => {
      if (cancelled) return;
      await refreshStockHoldingsForIds(ids);
    };

    refresh();
    const timer = setInterval(refresh, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [stockInvestmentIds.join(',')]);

  const fetchData = async () => {
    try {
      const [inv, bks, acts, invTypes, accounts] = await Promise.all([
        axios.get(`${API_URL}/investments`),
        axios.get(`${API_URL}/banks`),
        axios.get(`${API_URL}/type-of-assets`),
        axios.get(`${API_URL}/investment-types`),
        axios.get(`${API_URL}/savings`),
      ]);
      setInvestments(inv.data || []);
      setBanks(bks.data || []);
      setTypeOfAssets(acts.data || []);
      setInvestmentTypes(invTypes.data || []);
      setBankAccounts((accounts.data || []).filter((a) => !(a.is_system_managed && a.management_source === 'INVESTMENT')));
    } catch (err) {
      console.error('Error fetching investment data', err);
    }
  };

  const selectedInvestmentType = useMemo(
    () => investmentTypes.find((x) => String(x.id) === String(investmentTypeId)),
    [investmentTypes, investmentTypeId]
  );
  const isStocksEtf = useMemo(
    () => (selectedInvestmentType?.name || '').toLowerCase() === 'stocks/etfs',
    [selectedInvestmentType]
  );
  const selectedTypeOfAsset = useMemo(
    () => typeOfAssets.find((x) => String(x.id) === String(typeOfAssetId)),
    [typeOfAssets, typeOfAssetId]
  );

  const computedInitialAmount = useMemo(() => {
    if (!isStocksEtf) return Number(initialAmount || 0);
    return stocks.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  }, [isStocksEtf, stocks, initialAmount]);

  const resetAddForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setTypeOfAssetId('');
    setInvestmentTypeId('');
    setBankId('');
    setSourceAccountId('');
    setAssetDate(today);
    setInitialAmount('');
    setStocks([emptyStockRow(1)]);
  };

  const updateStockRow = (id, patch) => {
    setStocks((current) => current.map((row) => {
      if (row.id !== id) return row;
      const merged = { ...row, ...patch };
      const amountVal = Number(merged.amount || 0);
      const unitVal = Number(merged.unitPrice || 0);
      const quantity = amountVal > 0 && unitVal > 0 ? amountVal / unitVal : 0;
      return {
        ...merged,
        quantity: quantity > 0 ? quantity.toFixed(8) : '',
      };
    }));
  };

  const addStockRow = () => {
    const nextId = stocks.length > 0 ? Math.max(...stocks.map((x) => x.id)) + 1 : 1;
    setStocks((curr) => [...curr, emptyStockRow(nextId)]);
  };

  const removeStockRow = (id) => {
    setStocks((curr) => (curr.length === 1 ? curr : curr.filter((r) => r.id !== id)));
  };

  const fetchQuoteForRow = async (id) => {
    const row = stocks.find((x) => x.id === id);
    if (!row || !row.ticker.trim()) return;

    updateStockRow(id, { loading: true, error: '' });
    try {
      const res = await axios.get(`${API_URL}/investments/quote`, { params: { ticker: row.ticker.trim() } });
      updateStockRow(id, { unitPrice: Number(res.data.price).toFixed(4), loading: false, error: '' });
    } catch (err) {
      updateStockRow(id, { loading: false, error: err.response?.data?.error || 'Quote fetch failed.' });
    }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!typeOfAssetId || !investmentTypeId || !bankId || !sourceAccountId) {
      return alert('Please complete all required fields.');
    }

    if (isStocksEtf) {
      const hasInvalid = stocks.some((row) => {
        const ticker = String(row.ticker || '').trim();
        const amount = Number(row.amount || 0);
        const unitPrice = Number(row.unitPrice || 0);
        return !ticker || amount <= 0 || unitPrice <= 0;
      });
      if (hasInvalid) return alert('Please complete all stock rows with ticker, amount, and unit price.');
    }

    try {
      setIsSaving(true);
      const derivedName = selectedTypeOfAsset?.name || '';
      const payload = {
        name: derivedName,
        type_of_asset_id: Number(typeOfAssetId),
        investment_type_id: Number(investmentTypeId),
        bank_id: Number(bankId),
        source_account_id: Number(sourceAccountId),
        date: assetDate,
        initial_amount: Number(computedInitialAmount || 0),
        type: selectedInvestmentType?.name || 'Investment',
        account_type_id: Number(typeOfAssetId),
      };

      if (isStocksEtf) {
        payload.positions = stocks.map((row) => ({
          ticker: row.ticker.trim().toUpperCase(),
          amount: Number(row.amount),
          unit_price: Number(row.unitPrice),
          purchase_date: assetDate,
        }));
      }

      await axios.post(`${API_URL}/investments`, payload);
      setIsAddModalOpen(false);
      resetAddForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add asset.');
    } finally {
      setIsSaving(false);
    }
  };

  const openLogModal = (inv = null) => {
    if (inv) {
      setSelectedInvestmentId(String(inv.id));
      setLogBalance(inv.current_balance || '');
    } else {
      setSelectedInvestmentId('');
      setLogBalance('');
    }
    setLogContribution('0');
    setLogDate(new Date().toISOString().split('T')[0]);
    setIsLogModalOpen(true);
  };

  const openStockUpdateModal = async (inv) => {
    const invId = Number(inv.id);
    let latestHoldings = stockHoldingsByInvestmentId[invId] || [];
    try {
      const response = await axios.get(`${API_URL}/investments/${invId}/holdings/live`);
      latestHoldings = response.data?.holdings || [];
      setStockHoldingsByInvestmentId((current) => ({ ...current, [invId]: latestHoldings }));
    } catch (err) {}

    setStockUpdateInvestment(inv);
    setStockUpdateType('DIVIDEND_REINVESTMENT');
    setStockUpdateTicker(String(latestHoldings?.[0]?.ticker || ''));
    setStockUpdateDate(todayDate());
    setStockUpdateAmount('');
    setStockUpdateUnitPrice('');
    setStockUpdateShares('');
    setIsStockUpdateModalOpen(true);
  };

  const handleUpdateClick = (inv) => {
    if (isStockInvestment(inv)) {
      openStockUpdateModal(inv);
      return;
    }
    openLogModal(inv);
  };

  const handleStockUpdateAmountChange = (value, unitPriceOverride = null) => {
    const amountVal = Number(value || 0);
    const unitVal = Number(unitPriceOverride === null ? stockUpdateUnitPrice : unitPriceOverride);
    const nextShares = amountVal > 0 && unitVal > 0 ? (amountVal / unitVal).toFixed(8) : '';
    setStockUpdateAmount(value);
    setStockUpdateShares(nextShares);
  };

  const handleStockUpdateUnitPriceChange = (value) => {
    const amountVal = Number(stockUpdateAmount || 0);
    const unitVal = Number(value || 0);
    const nextShares = amountVal > 0 && unitVal > 0 ? (amountVal / unitVal).toFixed(8) : '';
    setStockUpdateUnitPrice(value);
    setStockUpdateShares(nextShares);
  };

  const handleSubmitStockUpdate = async (e) => {
    e.preventDefault();
    if (!stockUpdateInvestment) return;

    const amountVal = Number(stockUpdateAmount || 0);
    const unitPriceVal = Number(stockUpdateUnitPrice || 0);
    const sharesVal = Number(stockUpdateShares || 0);
    if (!stockUpdateTicker || !stockUpdateDate || amountVal <= 0 || unitPriceVal <= 0 || sharesVal <= 0) {
      return alert('Please complete all required fields with valid positive values.');
    }

    try {
      setIsStockUpdateSaving(true);
      await axios.post(`${API_URL}/investments/${stockUpdateInvestment.id}/positions`, {
        action_type: stockUpdateType,
        ticker: stockUpdateTicker,
        purchase_date: stockUpdateDate,
        amount: amountVal,
        unit_price: unitPriceVal,
        quantity: sharesVal,
      });

      setIsStockUpdateModalOpen(false);
      await Promise.all([
        fetchData(),
        refreshStockHoldingsForIds([Number(stockUpdateInvestment.id)]),
      ]);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save stock/ETF update.');
    } finally {
      setIsStockUpdateSaving(false);
    }
  };

  const handleLogUpdate = async (e) => {
    e.preventDefault();
    if (!selectedInvestmentId) return alert('Please select an investment asset.');

    try {
      await axios.post(`${API_URL}/investment-logs`, {
        investment_id: Number(selectedInvestmentId),
        date: logDate,
        balance: Number(logBalance),
        net_contribution: Number(logContribution || 0),
      });
      setIsLogModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to log update.');
    }
  };

  const openHistoryModal = async (inv) => {
    try {
      const [logsRes, activityRes] = await Promise.all([
        axios.get(`${API_URL}/investments/${inv.id}/logs`),
        axios.get(`${API_URL}/investments/${inv.id}/activity`),
      ]);

      const logEntries = (logsRes.data || []).map((row) => ({
        entryType: 'PERFORMANCE_LOG',
        id: `log-${row.id}`,
        occurredAt: row.date,
        title: 'Performance Log',
        summary: `Balance set to ${formatCurrency(row.balance)} with contribution ${formatCurrency(row.net_contribution || 0)}.`,
        details: {
          balance: Number(row.balance || 0),
          net_contribution: Number(row.net_contribution || 0),
        },
      }));

      const activityEntries = (activityRes.data || []).map((row) => ({
        entryType: 'ACTIVITY',
        id: `act-${row.id}`,
        occurredAt: row.created_at,
        title: String(row.action_type || 'Activity').replaceAll('_', ' '),
        summary: row.summary || 'Change recorded',
        details: row.metadata || {},
        actor: row.actor || 'system',
      }));

      const combined = [...activityEntries, ...logEntries].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
      setSelectedInvestment(inv);
      setInvestmentTimeline(combined);
      setIsHistoryModalOpen(true);
    } catch (err) {
      alert('Failed to load investment history.');
    }
  };

  const handleDelete = async (id) => {
    if (!(await showConfirm('Permanently delete this investment profile?', { title: 'Delete Investment Asset' }))) return;
    try {
      await axios.delete(`${API_URL}/investments/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Cannot delete asset.');
    }
  };

  const openHoldingsModal = async (inv) => {
    const invId = Number(inv.id);
    let holdings = stockHoldingsByInvestmentId[invId] || [];
    if (holdings.length === 0) {
      try {
        const response = await axios.get(`${API_URL}/investments/${invId}/holdings/live`);
        holdings = response.data?.holdings || [];
        setStockHoldingsByInvestmentId((current) => ({ ...current, [invId]: holdings }));
      } catch (err) {
        holdings = [];
      }
    }
    setSelectedInvestment(inv);
    setSelectedHoldings(holdings);
    setIsHoldingsModalOpen(true);
  };

  const renderDetailRows = (obj = {}) => {
    const entries = Object.entries(obj || {});
    if (entries.length === 0) {
      return <span className="text-muted" style={{ fontSize: '12px' }}>No extra details.</span>;
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
        {entries.map(([key, value]) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>{toPrettyLabel(key)}</span>
            <strong style={{ fontSize: '13px', color: '#dbeafe' }}>{typeof value === 'number' ? value.toLocaleString('en-US') : String(value)}</strong>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: 800, letterSpacing: '-0.5px' }}>Investment Portfolio</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: '15px' }}>Create linked investment assets, route initial transfer, and maintain value logs.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => openLogModal()} className="glass-button" style={{ padding: '12px 20px', fontWeight: 'bold' }}>
            Manual Investment Performance
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="glass-button" style={{ padding: '12px 24px', fontWeight: 'bold', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
            + Add Asset
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
        {investments.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No investments active. Add your first asset.
          </div>
        ) : (
          investments.map((inv) => {
            const bal = Number(inv.current_balance || 0);
            const contrib = Number(inv.total_contributed || 0);
            const profit = bal - contrib;
            const isProfit = profit >= 0;
            const isStockEtfAsset = isStockInvestment(inv);
            const holdings = stockHoldingsByInvestmentId[Number(inv.id)] || [];
            const holdingsInvestedTotal = holdings.reduce((sum, h) => sum + Number(h.total_amount_invested || 0), 0);
            const holdingsSharesTotal = holdings.reduce((sum, h) => sum + Number(h.total_shares || 0), 0);
            const holdingsGainTotal = holdings.reduce((sum, h) => sum + Number(h.unrealized_gain || 0), 0);
            const holdingsReturnPct = holdingsInvestedTotal > 0 ? (holdingsGainTotal / holdingsInvestedTotal) * 100 : 0;
            const holdingsTickers = holdings.slice(0, 3).map((h) => h.ticker).join(' • ');

            if (isStockEtfAsset) {
              return (
                <div key={inv.id} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', borderTop: '4px solid #f59e0b', background: 'linear-gradient(180deg, rgba(20,20,26,0.96) 0%, rgba(16,18,24,0.96) 100%)', boxShadow: '0 12px 30px rgba(0,0,0,0.25)', minHeight: '410px', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '1.28rem', fontWeight: 800 }}>📈 {inv.name}</h3>
                      <p className="text-muted" style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        {inv.type_of_asset_name || 'Asset'} • Stocks/ETFs • {inv.bank_name || 'External'}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(inv.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                  </div>

                  <p className="text-muted" style={{ margin: '0 0 12px 0', fontSize: '12px' }}>
                    Last updated: {inv.last_log_date ? new Date(inv.last_log_date).toLocaleDateString('en-CA') : 'No logs yet'}
                  </p>

                  <div style={{ marginBottom: '14px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <p style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', color: '#fbbf24', letterSpacing: '0.5px' }}>Holdings</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {holdings.length > 0 ? `${holdings.length} symbols • ${holdingsTickers}${holdings.length > 3 ? '...' : ''}` : 'No positions yet'}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ padding: '13px', borderRadius: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '10px', textTransform: 'uppercase' }}>Current Value</p>
                      <strong style={{ fontSize: '1.1rem', color: '#fef3c7' }}>{formatCurrency(bal)}</strong>
                    </div>
                    <div style={{ padding: '13px', borderRadius: '12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.22)' }}>
                      <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '10px', textTransform: 'uppercase' }}>Invested Capital</p>
                      <strong style={{ fontSize: '1.1rem', color: '#dbeafe' }}>{formatCurrency(holdingsInvestedTotal || contrib)}</strong>
                    </div>
                    <div style={{ padding: '13px', borderRadius: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}>
                      <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '10px', textTransform: 'uppercase' }}>Total Shares</p>
                      <strong style={{ fontSize: '1.05rem', color: '#ccfbf1' }}>{formatShares(holdingsSharesTotal)}</strong>
                    </div>
                    <div style={{ padding: '13px', borderRadius: '12px', background: 'rgba(15,23,42,0.72)', border: '1px solid rgba(148,163,184,0.22)' }}>
                      <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '10px', textTransform: 'uppercase' }}>Unrealized Return</p>
                      <strong style={{ fontSize: '1.05rem', color: holdingsGainTotal >= 0 ? '#22c55e' : '#ef4444' }}>{holdingsGainTotal >= 0 ? '+' : ''}{formatCurrency(holdingsGainTotal)} ({holdingsGainTotal >= 0 ? '+' : ''}{formatPercent(holdingsReturnPct)})</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: 'auto' }}>
                    <button onClick={() => handleUpdateClick(inv)} className="glass-button" style={{ width: '100%', padding: '10px', fontWeight: 'bold' }}>Update</button>
                    <button onClick={() => openHoldingsModal(inv)} className="glass-button" style={{ width: '100%', padding: '10px', fontWeight: 'bold', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: '#fbbf24' }}>Holdings</button>
                    <button onClick={() => openHistoryModal(inv)} className="glass-button" style={{ width: '100%', padding: '10px', fontWeight: 'bold', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)', color: '#22d3ee' }}>Logs</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={inv.id} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', borderTop: '4px solid #0ea5e9', background: 'linear-gradient(180deg, rgba(20,20,26,0.96) 0%, rgba(16,18,24,0.96) 100%)', minHeight: '410px', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.24rem', fontWeight: 800 }}>📈 {inv.name}</h3>
                    <p className="text-muted" style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {inv.type_of_asset_name || inv.account_type_name || 'Asset'} • {inv.investment_type_name || inv.type || 'Investment'} • {inv.bank_name || 'External'}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(inv.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ padding: '13px', borderRadius: '12px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                    <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '10px', textTransform: 'uppercase' }}>Current Value</p>
                    <strong style={{ fontSize: '1.1rem' }}>{formatCurrency(bal)}</strong>
                  </div>
                  <div style={{ padding: '13px', borderRadius: '12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '10px', textTransform: 'uppercase' }}>All-Time P/L</p>
                    <strong style={{ fontSize: '1.05rem', color: isProfit ? '#22c55e' : '#ef4444' }}>{isProfit ? '+' : ''}{formatCurrency(profit)}</strong>
                  </div>
                  <div style={{ padding: '13px', borderRadius: '12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '10px', textTransform: 'uppercase' }}>Net Contribution</p>
                    <strong style={{ fontSize: '1.05rem', color: '#dbeafe' }}>{formatCurrency(contrib)}</strong>
                  </div>
                  <div style={{ padding: '13px', borderRadius: '12px', background: 'rgba(15,23,42,0.72)', border: '1px solid rgba(148,163,184,0.22)' }}>
                    <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '10px', textTransform: 'uppercase' }}>Return</p>
                    <strong style={{ fontSize: '1.05rem', color: contrib > 0 ? (profit >= 0 ? '#22c55e' : '#ef4444') : 'var(--text-main)' }}>
                      {contrib > 0 ? `${profit >= 0 ? '+' : ''}${formatPercent((profit / contrib) * 100)}` : 'N/A'}
                    </strong>
                  </div>
                </div>

                <p className="text-muted" style={{ margin: '0 0 16px 0', fontSize: '12px' }}>
                  Last updated: {inv.last_log_date ? new Date(inv.last_log_date).toLocaleDateString('en-CA') : 'No logs yet'}
                </p>

                {(inv.investment_type_name || inv.type || '').toLowerCase() === 'stocks/etfs' && (
                  <div style={{ marginBottom: '14px', padding: '10px 12px', background: 'rgba(150,150,150,0.05)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Asset purchase date: {(inv.asset_date || inv.date) ? new Date(inv.asset_date || inv.date).toLocaleDateString('en-CA') : 'N/A'}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
                  <button onClick={() => handleUpdateClick(inv)} className="glass-button" style={{ width: '100%', padding: '10px', fontWeight: 'bold' }}>Update</button>
                  <button onClick={() => openHistoryModal(inv)} className="glass-button" style={{ width: '100%', padding: '10px', fontWeight: 'bold', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)', color: '#22d3ee' }}>Logs</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isAddModalOpen && (
        <ModalWrapper title="Add New Investment Asset" onClose={() => setIsAddModalOpen(false)}>
          <form onSubmit={handleAddAsset} style={{ display: 'flex', flexDirection: 'column', gap: '14px', boxSizing: 'border-box' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Type of Asset *</label>
                <select value={typeOfAssetId} onChange={(e) => setTypeOfAssetId(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px' }}>
                  <option value="">-- Select Type of Asset --</option>
                  {typeOfAssets.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Investment Type *</label>
                <select value={investmentTypeId} onChange={(e) => setInvestmentTypeId(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px' }}>
                  <option value="">-- Select Investment Type --</option>
                  {investmentTypes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Brokerage/Bank *</label>
                <select value={bankId} onChange={(e) => setBankId(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px' }}>
                  <option value="">-- Select Brokerage/Bank --</option>
                  {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Source Bank Account *</label>
                <select value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px' }}>
                  <option value="">-- Select Source Account --</option>
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bank_name} {a.account_type ? `(${a.account_type})` : ''} - Bal: C${Number(a.balance || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Asset Date *</label>
              <input type="date" value={assetDate} onChange={(e) => setAssetDate(e.target.value)} required className="glass-input glass-input-date" style={{ width: '100%', padding: '12px' }} />
            </div>

            {isStocksEtf ? (
              <div className="glass-card" style={{ padding: '14px', border: '1px solid rgba(14,165,233,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <strong style={{ fontSize: '14px' }}>Stocks/ETFs Positions</strong>
                  <button type="button" onClick={addStockRow} className="glass-button" style={{ padding: '6px 10px', fontSize: '12px' }}>+ Add Row</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stocks.map((row) => (
                    <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.95fr 0.85fr 120px', gap: '8px', alignItems: 'center' }}>
                      <input type="text" value={row.ticker} onChange={(e) => updateStockRow(row.id, { ticker: e.target.value.toUpperCase(), error: '' })} placeholder="Ticker (e.g., XEQT)" className="glass-input" style={{ padding: '10px' }} />
                      <input type="number" step="0.01" min="0" value={row.amount} onChange={(e) => updateStockRow(row.id, { amount: e.target.value })} placeholder="Amount" className="glass-input" style={{ padding: '10px' }} />
                      <input type="number" step="0.0001" min="0" value={row.unitPrice} onChange={(e) => updateStockRow(row.id, { unitPrice: e.target.value })} className="glass-input" style={{ padding: '10px' }} placeholder="Price" />
                      <input type="text" value={row.quantity} readOnly className="glass-input" style={{ padding: '10px' }} placeholder="Qty" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button type="button" onClick={() => fetchQuoteForRow(row.id)} className="glass-button" style={{ padding: '4px 10px', fontSize: '11px' }} disabled={row.loading}>
                          {row.loading ? 'Fetching...' : 'Fetch Market Price'}
                        </button>
                        <button type="button" onClick={() => removeStockRow(row.id)} className="glass-button glass-button-danger" style={{ width: '100%', height: '30px', padding: '0', fontSize: '14px', lineHeight: '1' }}>✕</button>
                      </div>
                      {row.error && <div style={{ gridColumn: '1 / -1', color: '#ef4444', fontSize: '12px' }}>{row.error}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Initial Amount (CAD)</label>
              <input type="number" step="0.01" min="0" value={isStocksEtf ? computedInitialAmount.toFixed(2) : initialAmount} onChange={(e) => setInitialAmount(e.target.value)} readOnly={isStocksEtf} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box', fontWeight: 'bold' }} />
              {isStocksEtf && <small className="text-muted">Auto-calculated from all stock/ETF rows.</small>}
            </div>

            <button type="submit" className="glass-button" style={{ width: '100%', padding: '14px', marginTop: '6px', fontWeight: 'bold', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.2)' }} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Create Linked Asset'}
            </button>
          </form>
        </ModalWrapper>
      )}

      {isLogModalOpen && (
        <ModalWrapper title="Manual Investment Performance" onClose={() => setIsLogModalOpen(false)}>
          <form onSubmit={handleLogUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Select Asset *</label>
              <select value={selectedInvestmentId} onChange={(e) => {
                setSelectedInvestmentId(e.target.value);
                const inv = investments.find((i) => String(i.id) === e.target.value);
                if (inv) setLogBalance(inv.current_balance || '');
              }} required className="glass-input" style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}>
                <option value="">-- Choose an Investment --</option>
                {investments.map((inv) => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>New Total Balance</label>
                <input type="number" step="0.01" value={logBalance} onChange={(e) => setLogBalance(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>New Contribution (CAD)</label>
                <input type="number" step="0.01" value={logContribution} onChange={(e) => setLogContribution(e.target.value)} required className="glass-input" style={{ width: '100%', padding: '12px' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Date</label>
              <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required className="glass-input glass-input-date" style={{ width: '100%', padding: '12px' }} />
            </div>
            <button type="submit" className="glass-button" style={{ width: '100%', padding: '14px', marginTop: '6px', fontWeight: 'bold' }}>Save Performance Log</button>
          </form>
        </ModalWrapper>
      )}

      {isStockUpdateModalOpen && (
        <ModalWrapper title={`Update Stock/ETF Holding${stockUpdateInvestment ? ` - ${stockUpdateInvestment.name}` : ''}`} onClose={() => setIsStockUpdateModalOpen(false)}>
          <form onSubmit={handleSubmitStockUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setStockUpdateType('DIVIDEND_REINVESTMENT')}
                className="glass-button"
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  border: stockUpdateType === 'DIVIDEND_REINVESTMENT' ? '1px solid rgba(34,197,94,0.55)' : '1px solid rgba(148,163,184,0.2)',
                  background: stockUpdateType === 'DIVIDEND_REINVESTMENT' ? 'rgba(34,197,94,0.12)' : 'rgba(15,23,42,0.35)',
                }}
              >
                <strong style={{ display: 'block', marginBottom: '4px' }}>💰 Record Dividend</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Log reinvested dividend into existing holding.</span>
              </button>
              <button
                type="button"
                onClick={() => setStockUpdateType('ADDITIONAL_PURCHASE')}
                className="glass-button"
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  border: stockUpdateType === 'ADDITIONAL_PURCHASE' ? '1px solid rgba(14,165,233,0.55)' : '1px solid rgba(148,163,184,0.2)',
                  background: stockUpdateType === 'ADDITIONAL_PURCHASE' ? 'rgba(14,165,233,0.12)' : 'rgba(15,23,42,0.35)',
                }}
              >
                <strong style={{ display: 'block', marginBottom: '4px' }}>📈 Record Additional Purchase</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Add more shares to an existing ticker.</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Stock/ETF Symbol *</label>
                <select value={stockUpdateTicker} onChange={(e) => setStockUpdateTicker(e.target.value)} className="glass-input" required style={{ width: '100%', padding: '12px' }}>
                  <option value="">-- Select Symbol --</option>
                  {(stockHoldingsByInvestmentId[Number(stockUpdateInvestment?.id)] || []).map((holding) => (
                    <option key={holding.ticker} value={holding.ticker}>{holding.ticker}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Date *</label>
                <input type="date" value={stockUpdateDate} onChange={(e) => setStockUpdateDate(e.target.value)} className="glass-input glass-input-date" required style={{ width: '100%', padding: '12px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                  {stockUpdateType === 'DIVIDEND_REINVESTMENT' ? 'Dividend Amount (CAD) *' : 'Investment Amount (CAD) *'}
                </label>
                <input type="number" step="0.01" min="0" value={stockUpdateAmount} onChange={(e) => handleStockUpdateAmountChange(e.target.value)} className="glass-input" required style={{ width: '100%', padding: '12px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Price per Share *</label>
                <input type="number" step="0.0001" min="0" value={stockUpdateUnitPrice} onChange={(e) => handleStockUpdateUnitPriceChange(e.target.value)} className="glass-input" required style={{ width: '100%', padding: '12px' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Number of Shares *</label>
              <input type="number" step="0.00000001" min="0" value={stockUpdateShares} onChange={(e) => setStockUpdateShares(e.target.value)} className="glass-input" required style={{ width: '100%', padding: '12px' }} />
              <small className="text-muted">Auto-calculated from amount / price. You can edit if needed.</small>
            </div>

            <button type="submit" className="glass-button" style={{ width: '100%', padding: '14px', marginTop: '6px', fontWeight: 'bold', background: 'rgba(14, 165, 233, 0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.3)' }} disabled={isStockUpdateSaving}>
              {isStockUpdateSaving ? 'Saving Update...' : 'Save Stock/ETF Update'}
            </button>
          </form>
        </ModalWrapper>
      )}

      {isHistoryModalOpen && (
        <ModalWrapper title={`Log Keeper${selectedInvestment ? ` - ${selectedInvestment.name}` : ''}`} onClose={() => setIsHistoryModalOpen(false)}>
          {investmentTimeline.length === 0 ? (
            <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No historical logs found for this investment.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {investmentTimeline.map((entry) => {
                const isActivity = entry.entryType === 'ACTIVITY';
                return (
                  <div key={entry.id} className="glass-card" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.4px', color: isActivity ? '#22c55e' : '#60a5fa' }}>
                        {entry.title}
                      </strong>
                      <span className="text-muted" style={{ fontSize: '12px' }}>{new Date(entry.occurredAt).toLocaleString('en-CA')}</span>
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{entry.summary}</p>
                    {entry.details?.change && (
                      <div style={{ marginBottom: '8px', padding: '10px', borderRadius: '10px', background: 'rgba(22,101,52,0.2)', border: '1px solid rgba(34,197,94,0.25)' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#86efac' }}>Changed Values</p>
                        {renderDetailRows(entry.details.change)}
                      </div>
                    )}
                    {entry.details?.old_values && (
                      <div style={{ marginBottom: '8px', padding: '10px', borderRadius: '10px', background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(148,163,184,0.22)' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#bfdbfe' }}>Old Values</p>
                        {renderDetailRows(entry.details.old_values)}
                      </div>
                    )}
                    {entry.details?.new_values && (
                      <div style={{ marginBottom: '8px', padding: '10px', borderRadius: '10px', background: 'rgba(2,132,199,0.14)', border: '1px solid rgba(14,165,233,0.3)' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7dd3fc' }}>New Values</p>
                        {renderDetailRows(entry.details.new_values)}
                      </div>
                    )}
                    {!entry.details?.change && !entry.details?.old_values && !entry.details?.new_values && (
                      <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.18)' }}>
                        {renderDetailRows(entry.details || {})}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ModalWrapper>
      )}

      {isHoldingsModalOpen && (
        <ModalWrapper title={`Holdings${selectedInvestment ? ` - ${selectedInvestment.name}` : ''}`} onClose={() => setIsHoldingsModalOpen(false)}>
          {selectedHoldings.length === 0 ? (
            <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No holdings found for this asset.</div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {selectedHoldings.map((holding) => {
                const gain = Number(holding.unrealized_gain || 0);
                const isGain = gain >= 0;
                return (
                  <div key={holding.ticker} className="glass-card" style={{ padding: '16px', border: '1px solid rgba(148,163,184,0.22)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                      <div>
                        <strong style={{ fontSize: '16px' }}>{holding.security_name}</strong>
                        <p className="text-muted" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>{holding.ticker}</p>
                      </div>
                      <strong style={{ fontSize: '14px', color: '#fef3c7' }}>{formatCurrency(holding.current_price)} / share</strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                      <div>
                        <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '11px' }}>Invested</p>
                        <strong>{formatCurrency(holding.total_amount_invested)}</strong>
                      </div>
                      <div>
                        <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '11px' }}>Shares</p>
                        <strong>{formatShares(holding.total_shares)}</strong>
                      </div>
                      <div>
                        <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '11px' }}>Current Value</p>
                        <strong>{formatCurrency(holding.current_value)}</strong>
                      </div>
                      <div>
                        <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '11px' }}>Return</p>
                        <strong style={{ color: isGain ? '#22c55e' : '#ef4444' }}>{isGain ? '+' : ''}{formatCurrency(gain)} ({isGain ? '+' : ''}{formatPercent(holding.return_pct)})</strong>
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
