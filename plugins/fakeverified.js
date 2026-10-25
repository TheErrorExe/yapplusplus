const fakeverified = {
  id: 'fakeverified',
  name: 'Fake verified',
  description: '(needs staff badge turned on) makes you have a verified badge! (only visible on your end)',
  VERIFIED_SRC: 'data:image/png;base64,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',
  observer: null,
  timer: null,
  paintTimer: null,
  warned: false,
  _me: null,
  subOf(jwt) {
    try {
      const p = String(jwt).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(p + '='.repeat((4 - p.length % 4) % 4))).sub || null;
    } catch (e) { return null; }
  },
  myId() {
    if (this._me) return this._me;
    try {
      const forced = localStorage.getItem('yapplus.fakeverified.id');
      if (forced) return (this._me = forced.trim().toLowerCase());
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf('sb-') === 0 && k.indexOf('-auth-token') !== -1) {
          let v = JSON.parse(localStorage.getItem(k));
          if (typeof v === 'string') v = JSON.parse(v);
          const s = (v && v.currentSession) || v;
          const id = s && ((s.user && s.user.id) || this.subOf(s.access_token));
          if (id) return (this._me = String(id).toLowerCase());
        }
      }
    } catch (e) {}
    const t = (typeof staffbadge !== 'undefined' && staffbadge.getToken) ? staffbadge.getToken() : null;
    const id = t && this.subOf(t);
    if (id) return (this._me = String(id).toLowerCase());
    return null;
  },
  start() {
    const self = this;
    if (!document.getElementById('yp-fakeverified-css')) {
      const css = document.createElement('style');
      css.id = 'yp-fakeverified-css';
      css.textContent = '.yp-fakeverified{height:16px;width:16px;margin-left:4px;vertical-align:-3px;align-self:center;object-fit:contain;user-select:none;}';
      (document.head || document.documentElement).appendChild(css);
    }
    this.observer = new MutationObserver(() => self.schedulePaint());
    this.observer.observe(document.documentElement, { childList: true, subtree: true });
    this.timer = setInterval(() => self.paint(), 1000);
    this.schedulePaint();
    console.log(`less go fakeverification's ballin`);
  },
  stop() {
    if (this.observer) { this.observer.disconnect(); this.observer = null; }
    clearInterval(this.timer);
    clearTimeout(this.paintTimer);
    document.querySelectorAll('.yp-fakeverified').forEach(el => el.remove());
    const css = document.getElementById('yp-fakeverified-css');
    if (css) css.remove();
    console.log(`murdered fakeverification`);
  },
  schedulePaint() {
    clearTimeout(this.paintTimer);
    this.paintTimer = setTimeout(() => this.paint(), 80);
  },
  paint() {
    if (typeof staffbadge === 'undefined' || !PluginHost.isEnabled(staffbadge)) {
      if (!this.warned) { this.warned = true; console.warn('[FakeVerified] turn on Staff Badge, this plugin needs its author map'); }
    }
    const me = this.myId();
    const map = (typeof staffbadge !== 'undefined' && staffbadge.msgAuthor) || null;
    document.querySelectorAll('.msg[data-message-id]').forEach(el => {
      if (el.hasAttribute('data-yp-ghost')) return;
      const name = el.querySelector('.msg-head .msg-author');
      if (!name) return;
      const head = name.parentNode;
      const existing = head.querySelector(':scope > .yp-fakeverified');
      const mine = !!(me && map && map.get(el.getAttribute('data-message-id')) === me);
      if (mine) {
        if (existing) return;
        const img = document.createElement('img');
        img.className = 'yp-fakeverified';
        img.src = this.VERIFIED_SRC;
        img.alt = 'Verified';
        img.title = 'flex ts in screenshots lol';
        img.draggable = false;
        const others = head.querySelectorAll(':scope > .yp-staff-badge, :scope > .yp-extra-badge');
        const last = others.length ? others[others.length - 1] : name;
        head.insertBefore(img, last.nextSibling);
      } else if (existing) {
        existing.remove();
      }
    });
  },
};

PluginHost.register(fakeverified);