window.YapPlus = window.YapPlus || {};
window.YapPlus.PluginHost = {
  plugins: [],
  listeners: [],
  register(plugin) {
    this.plugins.push(plugin);
    if (localStorage.getItem(`yapplus.plugin.${plugin.id}`) === '1') {
      try { plugin.start(); } catch (e) { console.error('[Libyapcore] E> P.H, P>', plugin.id, e); }
    }
    this.listeners.forEach(fn => fn(plugin));
  },
  isEnabled(plugin) {
    return localStorage.getItem(`yapplus.plugin.${plugin.id}`) === '1';
  },
  setEnabled(plugin, on) {
    localStorage.setItem(`yapplus.plugin.${plugin.id}`, on ? '1' : '0');
    try {
      if (on) plugin.start(); else plugin.stop();
    } catch (e) { console.error('Yap++ toggle failed', plugin.id, e); }
    this.listeners.forEach(fn => fn(plugin));
  },
  all() { return this.plugins.slice(); },
  onChange(fn) { this.listeners.push(fn); },
};
window.PluginHost = window.YapPlus.PluginHost;