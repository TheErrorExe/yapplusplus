const messagelogger = {
  id: 'messagelogger',
  name: 'MessageLogger',
  description: 'You know how messages get deleted right? What if they became **red** instead? (HAS SOME BUGS!)',
  origFetch: null,
  origAddEventListener: null,
  STORAGE_KEY: 'yapplus.messagelog',
  domObserver: null,
  renderTimer: null,

  start() {
    const self = this;

    const css = document.createElement('style');
    css.id = 'yapplus-ghost-css';
    css.textContent = `
      [data-yp-ghost] .msg-text,
      [data-yp-ghost] .msg-text * { color: #ff4b4b !important; }
      [data-yp-ghost] .msg-author { color: #ff4b4b !important; }
    `;
    (document.head || document.documentElement).appendChild(css);

    if (!this.origFetch) this.origFetch = window.fetch;
    const origFetch = this.origFetch;

    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const method = (init && init.method) || 'GET';
      const isMessages = url.indexOf('/rest/v1/messages') !== -1;

      if (isMessages && method === 'POST' && init && init.body) {
        try {
          const body = JSON.parse(init.body);
          const tempKey = `local-${Date.now()}-${Math.random()}`;
          self.recordWithKey(tempKey, 'outgoing', {
            content: body.content,
            channel_id: body.channel_id,
            author_id: body.author_id,
            created_at: new Date().toISOString(),
          });
          const p = origFetch.call(this, input, init);
          p.then(r => {
            if (!r.ok) return;
            r.clone().json().then(row => {
              if (row && row.id) self.rekey(tempKey, row.id);
            }).catch(() => {});
          }).catch(() => {});
          return p;
        } catch (e) {}
      }

      if (isMessages && method === 'DELETE') {
        const m = url.match(/id=eq\.([0-9a-f-]+)/i);
        if (m) self.markDeleted(m[1], true);
      }

      if (isMessages && method === 'PATCH' && init && init.body) {
        const m = url.match(/id=eq\.([0-9a-f-]+)/i);
        try {
          const body = JSON.parse(init.body);
          if (m && body.content) self.markEdited(m[1], body.content);
        } catch (e) {}
      }

      if (isMessages && method === 'GET') {
        return origFetch.call(this, input, init).then(async (res) => {
          if (!res.ok) return res;
          try {
            const text = await res.text();
            const rows = JSON.parse(text);
            if (!Array.isArray(rows)) return new Response(text, res);
            const channelMatch = url.match(/channel_id=eq\.([0-9a-f-]+)/i);
            const channelId = channelMatch ? channelMatch[1] : null;
            if (channelId) {
              const log = self.load();
              const extras = Object.values(log).filter(r =>
                r.deleted && r.channel_id === channelId
              );
              for (const r of extras) {
                if (!rows.find(x => x.id === r.id)) {
                  rows.push(self.toSupabaseRow(r));
                }
              }
              rows.sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            }
            return new Response(JSON.stringify(rows), {
              status: res.status,
              statusText: res.statusText,
              headers: res.headers,
            });
          } catch (e) {
            return res;
          }
        });
      }

      if (url.indexOf('/rest/v1/profiles') !== -1 ||
          url.indexOf('/rest/v1/users') !== -1 ||
          url.indexOf('who_online') !== -1) {
        return origFetch.call(this, input, init).then(res => {
          res.clone().json().then(rows => {
            if (Array.isArray(rows)) self.cacheAuthors(rows);
            else if (rows && typeof rows === 'object') self.cacheAuthors([rows]);
          }).catch(() => {});
          return res;
        });
      }

      return origFetch.call(this, input, init);
    };

    if (!this.origAddEventListener) {
      this.origAddEventListener = WebSocket.prototype.addEventListener;
    }
    const origAddEL = this.origAddEventListener;

    WebSocket.prototype.addEventListener = function (type, listener, options) {
      if (type !== 'message') return origAddEL.call(this, type, listener, options);
      const wrapped = function (ev) {
        try {
          const frame = JSON.parse(ev.data);
          const data = frame && frame.payload && frame.payload.data;
          if (data && data.table === 'messages') {
            const t = data.type || frame.event;
            if (t === 'INSERT') {
              self.record('incoming', data.record);
              self.scheduleGhostPaint();
            } else if (t === 'UPDATE') {
              self.markEdited(data.record.id, data.record.content);
            } else if (t === 'DELETE') {
              const old = data.old_record || data.old;
              if (old && old.id) self.markDeleted(old.id, true);
            }
          }
        } catch (e) {}
        return listener.call(this, ev);
      };
      return origAddEL.call(this, type, wrapped, options);
    };

    this.installGhostStrip();
    this.scheduleGhostPaint();
    console.log('[Messagelogger] armed');
  },

  stop() {
    if (this.origFetch) { window.fetch = this.origFetch; this.origFetch = null; }
    if (this.origAddEventListener) {
      WebSocket.prototype.addEventListener = this.origAddEventListener;
      this.origAddEventListener = null;
    }
    if (this.domObserver) { this.domObserver.disconnect(); this.domObserver = null; }
    if (this.renderTimer) { clearInterval(this.renderTimer); this.renderTimer = null; }
    clearTimeout(this._paintDebounce);
    clearTimeout(this._paintDebounce2);
    clearTimeout(this._paintDebounce3);
    const strip = document.getElementById('yapplus-ghost-strip');
    if (strip) strip.remove();
    const css = document.getElementById('yapplus-ghost-css');
    if (css) css.remove();
    console.log('[Messagelogger] disarmed');
  },

  load() {
    try { return JSON.parse(sessionStorage.getItem(this.STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  },
  save(data) {
    const arr = Object.values(data).filter(r => r && r.created_at);
    while (arr.length > 500) {
      const oldest = arr.reduce((a, b) => a.created_at < b.created_at ? a : b);
      delete data[oldest.id || oldest.created_at];
    }
    try { sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(data)); }
    catch (e) {}
  },

  cacheAuthors(rows) {
    const data = this.load();
    let changed = false;
    for (const r of rows) {
      if (!r || typeof r !== 'object') continue;
      const id = r.id || r.user_id || r.author_id;
      if (!id) continue;
      const username = r.username || r.display_name || r.name || r.handle;
      const avatar = r.avatar_url || r.avatar || r.profile_picture || r.pfp;
      if (!username && !avatar) continue;
      data['__author__' + id] = { id, username, avatar };
      changed = true;
    }
    if (changed) this.save(data);
  },

  getAuthor(id) {
    const data = this.load();
    return data['__author__' + id] || null;
  },

  record(direction, row) {
    const key = row.id || `local-${Date.now()}-${Math.random()}`;
    this.recordWithKey(key, direction, row);
  },
  recordWithKey(key, direction, row) {
    const data = this.load();
    data[key] = {
      id: row.id || null,
      direction,
      content: row.content,
      channel_id: row.channel_id,
      author_id: row.author_id,
      created_at: row.created_at || new Date().toISOString(),
      deleted: false,
      edited: false,
    };
    if (row.author_id) {
      const cached = data['__author__' + row.author_id];
      if (cached) {
        data[key].author_username = cached.username;
        data[key].author_avatar = cached.avatar;
        data[key].author_avatar_style = cached.avatar_style;
      }
    }
    this.save(data);
  },
  rekey(oldKey, newId) {
    const data = this.load();
    if (!data[oldKey]) return;
    data[oldKey].id = newId;
    data[newId] = data[oldKey];
    delete data[oldKey];
    this.save(data);
  },
  markDeleted(id, toast) {
    const data = this.load();
    if (!data[id]) return false;
    if (data[id].deleted) return true;
    data[id].deleted = true;
    data[id].deleted_at = new Date().toISOString();
    this.save(data);
    if (toast) this.showToast(data[id]);
    this.scheduleGhostPaint();
    return true;
  },
  markEdited(id, newContent) {
    const data = this.load();
    if (!data[id]) return;
    if (!data[id].edits) data[id].edits = [];
    data[id].edits.push({ at: new Date().toISOString(), content: newContent });
    data[id].edited = true;
    this.save(data);
  },

  toSupabaseRow(r) {
    return {
      id: r.id,
      channel_id: r.channel_id,
      author_id: r.author_id,
      content: r.content,
      created_at: r.created_at,
      edited_at: null,
      attachment_path: null,
      attachment_width: null,
      attachment_height: null,
      reply_to_id: null,
      pinned_at: null,
      pinned_by: null,
    };
  },

  currentChannelId() {
    try {
      const url = location.href;
      const m = url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (m) return m[1];
    } catch (e) {}
    try {
      const p = JSON.parse(localStorage.getItem('yapper:place') || '{}');
      return p.c || null;
    } catch (e) { return null; }
  },

  scheduleGhostPaint() {
    const self = this;
    clearTimeout(this._paintDebounce);
    clearTimeout(this._paintDebounce2);
    clearTimeout(this._paintDebounce3);
    this._paintDebounce = setTimeout(() => self.paintGhosts(), 60);
    this._paintDebounce2 = setTimeout(() => self.paintGhosts(), 250);
    this._paintDebounce3 = setTimeout(() => self.paintGhosts(), 800);
  },

  paintGhosts() {
    const list = document.querySelector('.messages');
    if (!list) return;
    const channelId = this.currentChannelId();
    if (!channelId) return;

    const log = this.load();
    const ghosts = Object.values(log).filter(r =>
      r && r.deleted && r.channel_id === channelId
    );

    list.querySelectorAll('[data-yp-ghost]').forEach(el => {
      const gid = el.getAttribute('data-message-id');
      if (!ghosts.find(g => g.id === gid)) el.remove();
    });

    for (const g of ghosts) {
      if (list.querySelector(`.msg[data-message-id="${g.id}"]`)) continue;
      const el = this.buildGhostEl(g);
      if (!el) continue;
      const realMsgs = [...list.querySelectorAll('.msg[data-message-id]')];
      let insertBefore = null;
      for (const real of realMsgs) {
        const id = real.getAttribute('data-message-id');
        const row = Object.values(log).find(r => r && r.id === id);
        if (row && row.created_at > g.created_at) { insertBefore = real; break; }
      }
      if (insertBefore && insertBefore.parentNode === list) {
        list.insertBefore(el, insertBefore);
      } else {
        list.appendChild(el);
      }
    }

    let dirty = false;
    const log2 = this.load();
    for (const g of ghosts) {
      if (g.author_username && g.author_avatar && g.author_avatar_style) continue;
      const real = list.querySelector(`.msg[data-message-id="${g.id}"]`);
      if (!real) continue;
      const authorEl = real.querySelector('.msg-author');
      const img = real.querySelector('.avatar img');
      if (authorEl && !g.author_username) {
        g.author_username = authorEl.textContent.trim();
        dirty = true;
      }
      if (img && !g.author_avatar) {
        g.author_avatar = img.getAttribute('src');
        g.author_avatar_style = img.getAttribute('style') || '';
        dirty = true;
      }
      if (g.author_id && (g.author_username || g.author_avatar)) {
        log2['__author__' + g.author_id] = {
          id: g.author_id,
          username: g.author_username,
          avatar: g.author_avatar,
          avatar_style: g.author_avatar_style,
        };
      }
      if (dirty) log2[g.id] = g;
    }
    if (dirty) this.save(log2);

    try {
      document.querySelectorAll('.msg[data-message-id]').forEach(el => {
        const id = el.getAttribute('data-message-id');
        const l = this.load();
        if (l[id] && l[id].deleted) {
          el.querySelectorAll('.msg-text, .msg-text *').forEach(n =>
            n.style.setProperty('color', '#ff4b4b', 'important'));
        }
      });
    } catch (e) {}
  },

  buildGhostEl(g) {
    const data = this.load();
    const cached = data['__author__' + g.author_id] || {};
    const username = (g.author_username || cached.username || 'deleted user') + ' (deleted)';
    const avatar = g.author_avatar || cached.avatar || null;
    const avatarStyle = g.author_avatar_style || cached.avatar_style || 'object-fit:cover;';

    const el = document.createElement('div');
    el.className = 'msg';
    el.setAttribute('data-yp-ghost', '1');
    el.setAttribute('data-message-id', g.id);
    el.style.background = 'transparent';

    const avatarHtml = avatar
      ? `<span class="avatar-clip" style="position:absolute;inset:0;border-radius:50%;overflow:hidden;"><img alt="" draggable="false" src="${this.escapeHtml(avatar)}" style="${this.escapeHtml(avatarStyle)}"></span>`
      : `<div style="width:40px;height:40px;border-radius:50%;background:#ff4b4b;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">?</div>`;

    el.innerHTML =
      `<div class="msg-gutter">` +
        `<button type="button" class="avatar" style="position:relative;width:40px;height:40px;background:transparent;padding:0;border:none;cursor:default;">${avatarHtml}</button>` +
      `</div>` +
      `<div class="msg-body">` +
        `<div class="msg-head">` +
          `<button class="msg-author" style="color:#ff4b4b;cursor:default;">${this.escapeHtml(username)}</button>` +
          `<span class="msg-time">${new Date(g.created_at).toLocaleTimeString()}</span>` +
        `</div>` +
        `<div class="msg-text" style="color:#ff4b4b !important;">${this.escapeHtml(g.content)}</div>` +
      `</div>` +
      `<div class="msg-actions"></div>`;
    return el;
  },

  escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  installGhostStrip() {
    if (document.getElementById('yapplus-ghost-strip')) return;
    const self = this;

    const strip = document.createElement('div');
    strip.id = 'yapplus-ghost-strip';
    strip.style.cssText = 'padding:6px 16px;font-size:12px;color:#ff4b4b;background:rgba(255,75,75,0.08);border-top:1px solid rgba(255,75,75,0.2);cursor:pointer;display:none;user-select:none;';
    strip.addEventListener('click', () => {
      const l = document.getElementById('yapplus-ghost-list');
      if (l) l.style.display = l.style.display === 'none' ? 'block' : 'none';
    });

    const list = document.createElement('div');
    list.id = 'yapplus-ghost-list';
    list.style.cssText = 'display:none;max-height:200px;overflow-y:auto;padding:8px 16px;font-size:12px;background:rgba(255,75,75,0.04);border-top:1px solid rgba(255,75,75,0.15);color:#ffb3b3;';

    const attach = () => {
      const composer = document.querySelector('.composer');
      if (!composer || !composer.parentNode) return false;
      if (!document.getElementById('yapplus-ghost-strip')) {
        composer.parentNode.insertBefore(list, composer);
        composer.parentNode.insertBefore(strip, list);
      }
      return true;
    };

    if (!attach()) {
      const obs = new MutationObserver(() => {
        if (attach()) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }

    this.renderTimer = setInterval(() => {
      const log = self.load();
      const channelId = self.currentChannelId();
      const items = Object.values(log).filter(r =>
        r && r.deleted && r.channel_id === channelId
      );
      if (items.length === 0) {
        strip.style.display = 'none';
        list.style.display = 'none';
        list.innerHTML = '';
        return;
      }
      strip.style.display = 'block';
      strip.textContent = `${items.length} deleted message${items.length === 1 ? '' : 's'} in this channel; click to view`;
      list.innerHTML = items
        .sort((a, b) => a.created_at < b.created_at ? 1 : -1)
        .map(r => {
          const cached = log['__author__' + r.author_id] || {};
          const name = r.author_username || cached.username || 'deleted user';
          return `<div style="margin-bottom:6px;"><span style="color:#ff8a8a;">${new Date(r.created_at).toLocaleString()}</span> &nbsp;Ã‚Â·&nbsp; <b style="color:#ff6b6b;">${self.escapeHtml(name)}</b>: <span style="color:#ff4b4b;">${self.escapeHtml(r.content)}</span></div>`;
        })
        .join('');
    }, 1000);
  },

  showToast(row) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#1e1f22;border:1px solid rgba(255,75,75,0.4);border-left:3px solid #ff4b4b;color:#dbdee1;padding:10px 14px;border-radius:8px;font-size:13px;z-index:2147483647;max-width:320px;box-shadow:0 8px 24px rgba(0,0,0,.5);';
    t.innerHTML = `<div style="color:#ff4b4b;font-weight:700;margin-bottom:4px;">message deleted</div><div style="color:#b5bac1;font-size:12px;margin-bottom:6px;">${new Date().toLocaleTimeString()}</div><div style="color:#ff4b4b;">${this.escapeHtml(row.content)}</div>`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 8000);
  },
};

PluginHost.register(messagelogger);

