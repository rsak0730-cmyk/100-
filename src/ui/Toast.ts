// AETHER — toast notifications
export type ToastKind = 'info' | 'error' | 'success';

export class ToastStack {
  private host: HTMLElement;

  constructor(host: HTMLElement) {
    this.host = host;
  }

  show(message: string, kind: ToastKind = 'info', ttl = 4200): void {
    const el = document.createElement('div');
    el.className = `toast toast--${kind}`;
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    const dot = document.createElement('span');
    dot.className = 'toast__dot';
    const text = document.createElement('span');
    text.textContent = message;
    el.append(dot, text);
    this.host.appendChild(el);

    window.setTimeout(() => {
      el.classList.add('toast--leaving');
      window.setTimeout(() => el.remove(), 280);
    }, ttl);
  }

  info(message: string): void { this.show(message, 'info'); }
  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error', 5600); }
}
