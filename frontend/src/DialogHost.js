import React, { useEffect, useMemo, useState } from 'react';
import { clearDialogHandlers, registerDialogHandlers } from './dialogService';

const defaultDialog = {
  type: 'alert',
  title: 'Notice',
  message: '',
  defaultValue: '',
  placeholder: '',
  confirmText: 'OK',
  cancelText: 'Cancel',
};

const DialogHost = () => {
  const [queue, setQueue] = useState([]);
  const [promptValue, setPromptValue] = useState('');

  const activeDialog = queue.length > 0 ? queue[0] : null;

  const enqueue = (dialog) => new Promise((resolve) => {
    setQueue((prev) => [...prev, { ...defaultDialog, ...dialog, resolve }]);
  });

  const closeActive = (result) => {
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const [first, ...rest] = prev;
      first.resolve(result);
      return rest;
    });
  };

  useEffect(() => {
    registerDialogHandlers({
      alert: (message, options = {}) => enqueue({ type: 'alert', message, ...options }),
      confirm: (message, options = {}) => enqueue({ type: 'confirm', title: 'Confirm Action', message, ...options }),
      prompt: (message, options = {}) => enqueue({ type: 'prompt', title: 'Input Required', message, ...options }),
    });

    const nativeAlert = window.alert;
    window.alert = (message) => {
      enqueue({ type: 'alert', message });
    };

    return () => {
      window.alert = nativeAlert;
      clearDialogHandlers();
    };
  }, []);

  useEffect(() => {
    if (activeDialog?.type === 'prompt') {
      setPromptValue(activeDialog.defaultValue || '');
    }
  }, [activeDialog]);

  const modalTitle = useMemo(() => activeDialog?.title || 'Notice', [activeDialog]);

  if (!activeDialog) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 12000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div className="glass-card" style={{ width: '100%', maxWidth: '460px', padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(150,150,150,0.15)' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{modalTitle}</h3>
        </div>

        <div style={{ padding: '20px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
            {activeDialog.message}
          </p>

          {activeDialog.type === 'prompt' && (
            <input
              type="text"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              className="glass-input"
              placeholder={activeDialog.placeholder || ''}
              style={{ width: '100%', marginTop: '14px', padding: '12px' }}
              autoFocus
            />
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '0 22px 20px' }}>
          {(activeDialog.type === 'confirm' || activeDialog.type === 'prompt') && (
            <button
              type="button"
              onClick={() => closeActive(activeDialog.type === 'confirm' ? false : null)}
              className="glass-button"
              style={{ padding: '10px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              {activeDialog.cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (activeDialog.type === 'alert') closeActive(undefined);
              else if (activeDialog.type === 'confirm') closeActive(true);
              else closeActive(promptValue);
            }}
            className="glass-button"
            style={{ padding: '10px 14px', fontWeight: 700 }}
          >
            {activeDialog.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DialogHost;
