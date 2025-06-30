export function showToast(message: string, type?: string, duration?: number) {
  type = type || 'info';
  duration = duration || 3000;

  const toast = document.getElementById('toast');
  if (!toast) {
    console.error('Toast element not found');
    return;
  }

  toast.textContent = message;
  toast.className = 'toast ' + type;

  // Show toast
  setTimeout(function () {
    toast.classList.add('show');
  }, 10);

  // Hide toast after duration
  setTimeout(function () {
    toast.classList.remove('show');
  }, duration);
}
