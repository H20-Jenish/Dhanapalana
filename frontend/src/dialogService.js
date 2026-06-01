let dialogHandlers = {
  alert: null,
  confirm: null,
  prompt: null,
};

export const registerDialogHandlers = (handlers) => {
  dialogHandlers = {
    ...dialogHandlers,
    ...handlers,
  };
};

export const clearDialogHandlers = () => {
  dialogHandlers = {
    alert: null,
    confirm: null,
    prompt: null,
  };
};

export const showAlert = (message, options = {}) => {
  if (dialogHandlers.alert) return dialogHandlers.alert(message, options);
  console.warn('DialogHost not ready for alert:', message);
  return Promise.resolve();
};

export const showConfirm = (message, options = {}) => {
  if (dialogHandlers.confirm) return dialogHandlers.confirm(message, options);
  console.warn('DialogHost not ready for confirm:', message);
  return Promise.resolve(false);
};

export const showPrompt = (message, options = {}) => {
  if (dialogHandlers.prompt) return dialogHandlers.prompt(message, options);
  console.warn('DialogHost not ready for prompt:', message);
  return Promise.resolve(null);
};
