type ToastType = 'success' | 'error';

let toastRoot: HTMLDivElement | null = null;

function ensureContainer(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  if (toastRoot) return toastRoot;

  toastRoot = document.createElement('div');
  toastRoot.id = 'toast-root';
  toastRoot.className = 'toast-root';
  document.body.appendChild(toastRoot);
  return toastRoot;
}

function showToast(message: string, type: ToastType): void {
  const root = ensureContainer();
  if (!root) return;

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  root.appendChild(el);

  requestAnimationFrame(() => {
    el.classList.add('visible');
  });

  setTimeout(() => {
    el.classList.remove('visible');
    setTimeout(() => {
      if (root.contains(el)) {
        root.removeChild(el);
      }
    }, 250);
  }, 2600);
}

export function toastSuccess(message: string): void {
  showToast(message, 'success');
}

export function toastError(message: string): void {
  showToast(message, 'error');
}
