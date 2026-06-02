// 简单 DOM 级 Toast，不需要 React Context
export function showToast(message: string, type: 'success' | 'error' | 'info' = 'success', duration = 3000) {
  const container = document.getElementById('__toast_container__') || (() => {
    const el = document.createElement('div');
    el.id = '__toast_container__';
    el.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(el);
    return el;
  })();

  const colorMap = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const toast = document.createElement('div');
  toast.className = `${colorMap[type]} text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-opacity duration-300 pointer-events-auto`;
  toast.style.opacity = '1';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      container.removeChild(toast);
      if (container.childElementCount === 0) {
        document.body.removeChild(container);
      }
    }, 300);
  }, duration);
}
