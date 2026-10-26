const messagelogger = {
  id: 'messagelogger',
  name: 'MessageLogger',
  description: 'what the fuck',
  
  origfetch: null,
  origaddeventlistener: null,
  
  ghosts: new Map(),
  edits: new Map(),
  removedcandidates: new Map(),

  settings: {
    logdeletes: true,
    logedits: true,
    deletestyle: 'text',
    ignoreself: false,
    ignorebots: false,
    ignoreusers: '',
    ignorechannels: ''
  },

  loadsettings() {
    try {
      const saved = localStorage.getItem('yapplus.messagelogger.settings');
      if (saved) Object.assign(this.settings, JSON.parse(saved));
    } catch(e) {}
  },

  savesettings() {
    try {
      localStorage.setItem('yapplus.messagelogger.settings', JSON.stringify(this.settings));
    } catch(e) {}
  },

  applystyleclass() {
    document.documentElement.classList.toggle('ym-ml-overlay', this.settings.deletestyle === 'overlay');
    document.documentElement.classList.toggle('ym-ml-text', this.settings.deletestyle !== 'overlay');
  },

  isignored(msg) {
    if (!msg) return true;
    const s = this.settings;
    const parse = (str) => new Set(String(str || '').split(/[\s,;]+/).filter(Boolean));
    
    if (s.ignoreself) {
      const myid = window.staffbadge?.getToken ? window.staffbadge.getToken() : null;
      if (myid && msg.author_id === myid) return true;
    }
    
    if (s.ignorebots && msg.webhook) return true;
    if (parse(s.ignoreusers).has(msg.author_id)) return true;
    if (parse(s.ignorechannels).has(msg.channel_id)) return true;
    
    return false;
  },

  start() {
    const self = this;
    this.loadsettings();
    this.applystyleclass();

    const css = document.createElement('style');
    css.id = 'ym-ml-css';
    css.textContent = `
      .msg:has(> .ym-ghost-mark) .msg-actions { display: none !important; }
      .ym-ml-text .msg:has(> .ym-ghost-mark) .msg-text, 
      .ym-ml-text .msg:has(> .ym-ghost-mark) .msg-text * { color: #ff4b4b !important; }
      .ym-ml-overlay .msg:has(> .ym-ghost-mark) { background: rgba(255, 75, 75, 0.14) !important; box-shadow: inset 3px 0 0 #ff4b4b; }
      
      .ym-ml-tag { margin-top: 2px; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #ff4b4b; display: flex; gap: 8px; align-items: center; }
      .ym-ml-tag .ym-link { all: unset; cursor: pointer; font-weight: 500; text-transform: none; letter-spacing: 0; color: #949ba4; text-decoration: underline; }
      .ym-ml-tag .ym-link:hover { color: #dbdee1; }
      
      .ym-ml-edits { margin-top: 2px; display: flex; flex-direction: column; gap: 1px; }
      .ym-ml-edit { font-size: 13px; color: #6e6f7b; white-space: pre-wrap; overflow-wrap: anywhere; opacity: .9; }
      .ym-ml-edit:before { content: "↪  "; }
    `;
    document.head.appendChild(css);

    // FIX: Bind native fetch to window so 'this' doesn't break native checks
    this.origfetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input?.url || '');
      const method = (init?.method) || 'GET';
      const ismessages = url.includes('/rest/v1/messages');

      if (ismessages && method === 'DELETE') {
        const m = url.match(/id=eq\.([0-9a-f-]+)/i);
        if (m) self.handledelete(m[1]);
      }

      if (ismessages && method === 'PATCH' && init?.body) {
        const m = url.match(/id=eq\.([0-9a-f-]+)/i);
        try {
          const body = JSON.parse(init.body);
          if (m && body.content) self.handleedit(m[1], body.content);
        } catch (e) {}
      }

      return self.origfetch(input, init);
    };

    this.origaddeventlistener = WebSocket.prototype.addEventListener;
    WebSocket.prototype.addEventListener = function (type, listener, options) {
      if (type !== 'message') return self.origaddeventlistener.call(this, type, listener, options);
      
      const wrapped = function (ev) {
        try {
          const frame = JSON.parse(ev.data);
          const data = frame?.payload?.data;
          if (data?.table === 'messages') {
            const t = data.type || frame.event;
            if (t === 'UPDATE' && self.settings.logedits) {
              self.handleedit(data.record.id, data.record.content);
            } else if (t === 'DELETE') {
              const old = data.old_record || data.old;
              if (old?.id) self.handledelete(old.id);
            }
          }
        } catch (e) {}
        return listener.call(this, ev);
      };
      
      return self.origaddeventlistener.call(this, type, wrapped, options);
    };

    window.addEventListener('yapper:message-removed', (ev) => {
      const id = ev?.detail;
      const msg = self.removedcandidates.get(id);
      self.removedcandidates.delete(id);
      
      if (!msg || !self.settings.logdeletes || self.isignored(msg)) return;
      
      const ghost = { ...msg, deleted: true, deletedat: new Date().toISOString() };
      delete ghost.pending;
      delete ghost.failed;
      
      self.ghosts.set(id, ghost);
      queueMicrotask(() => self.paint());
    });

    this.paintinterval = setInterval(() => self.paint(), 1000);
    this.paint();
    console.log('[MessageLogger] armed');
  },

  handledelete(id) {
    const el = document.querySelector(`.msg[data-message-id="${id}"]`);
    if (!el) return;
    
    const text = el.querySelector('.msg-text')?.textContent || '';
    const author = el.querySelector('.msg-author')?.textContent || 'Unknown';
    const avatar = el.querySelector('.avatar img')?.src || null;
    
    this.removedcandidates.set(id, {
      id,
      author_id: el.getAttribute('data-author-id') || 'unknown',
      channel_id: this.currentchannelid(),
      content: text,
      author_username: author,
      author_avatar: avatar,
      created_at: new Date().toISOString()
    });
  },

  handleedit(id, newcontent) {
    if (!this.settings.logedits) return;
    
    const el = document.querySelector(`.msg[data-message-id="${id}"]`);
    const textel = el?.querySelector('.msg-text');
    if (!textel) return;
    
    const oldcontent = textel.textContent;
    if (oldcontent === newcontent) return;
    
    const list = this.edits.get(id) || [];
    if (list.at(-1)?.content !== oldcontent) {
      list.push({ content: oldcontent, at: new Date().toISOString() });
      this.edits.set(id, list);
      if (this.edits.size > 500) this.edits.delete(this.edits.keys().next().value);
    }
  },

  currentchannelid() {
    try {
      const m = location.href.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (m) return m[1];
    } catch (e) {}
    return null;
  },

  paint() {
    const channelid = this.currentchannelid();
    if (!channelid) return;

    this.ghosts.forEach(ghost => {
      if (ghost.channel_id !== channelid) return;
      
      let el = document.querySelector(`.msg[data-message-id="${ghost.id}"]`);
      
      if (!el) {
        el = this.buildghostel(ghost);
        document.querySelector('.messages')?.appendChild(el);
      }

      if (el && !el.querySelector(':scope > .ym-ghost-mark')) {
        const mark = document.createElement('span');
        mark.className = 'ym-ghost-mark';
        mark.hidden = true;
        el.appendChild(mark);

        const tag = document.createElement('div');
        tag.className = 'ym-ml-tag';
        tag.innerHTML = `<span>Deleted</span>`;
        
        const btn = document.createElement('button');
        btn.className = 'ym-link';
        btn.textContent = 'remove from log';
        btn.onclick = (e) => {
          e.stopPropagation();
          this.ghosts.delete(ghost.id);
          el.remove();
        };
        tag.appendChild(btn);
        el.querySelector('.msg-body')?.appendChild(tag);
      }
    });

    document.querySelectorAll('.msg[data-message-id]').forEach(el => {
      const id = el.getAttribute('data-message-id');
      const edits = this.edits.get(id);
      const body = el.querySelector('.msg-body');
      const textel = el.querySelector('.msg-text');
      if (!body) return;

      const box = body.querySelector('.ym-ml-edits');
      
      if (!edits?.length) {
        box?.remove();
        return;
      }

      if (box?.dataset.count === String(edits.length)) return;

      const newbox = document.createElement('div');
      newbox.className = 'ym-ml-edits';
      newbox.dataset.count = edits.length;
      
      edits.forEach(e => {
        const div = document.createElement('div');
        div.className = 'ym-ml-edit';
        div.title = 'Edited ' + new Date(e.at).toLocaleTimeString();
        div.textContent = e.content;
        newbox.appendChild(div);
      });

      if (box) box.replaceWith(newbox);
      else if (textel?.parentNode === body) textel.after(newbox);
      else body.appendChild(newbox);
    });
  },

  buildghostel(ghost) {
    const el = document.createElement('div');
    el.className = 'msg';
    el.setAttribute('data-message-id', ghost.id);
    el.style.opacity = '0.8';
    
    const avatarhtml = ghost.author_avatar 
      ? `<img alt="" src="${ghost.author_avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` 
      : `<div style="width:40px;height:40px;border-radius:50%;background:#ff4b4b;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">?</div>`;

    el.innerHTML = `
      <div class="msg-gutter">
        <button type="button" class="avatar" style="position:relative;width:40px;height:40px;background:transparent;padding:0;border:none;cursor:default;">
          ${avatarhtml}
        </button>
      </div>
      <div class="msg-body">
        <div class="msg-head">
          <button class="msg-author" style="color:#ff4b4b;cursor:default;">${ghost.author_username}</button>
          <span class="msg-time">${new Date(ghost.deletedat).toLocaleTimeString()}</span>
        </div>
        <div class="msg-text" style="color:#ff4b4b !important;">${ghost.content}</div>
      </div>
      <div class="msg-actions"></div>
    `;
    return el;
  },

  stop() {
    if (this.origfetch) {
      window.fetch = this.origfetch;
      this.origfetch = null;
    }
    if (this.origaddeventlistener) {
      WebSocket.prototype.addEventListener = this.origaddeventlistener;
      this.origaddeventlistener = null;
    }
    clearInterval(this.paintinterval);
    
    document.querySelectorAll('.ym-ghost-mark, .ym-ml-tag, .ym-ml-edits').forEach(n => n.remove());
    document.getElementById('ym-ml-css')?.remove();
    
    this.ghosts.clear();
    this.edits.clear();
  }
};

window.PluginHost.register(messagelogger);