const custombackground = {
    id: 'custombackground',
    name: 'Custom Background',
    description: 'Set a custom background!!! (Credits: @shizu)',

    cssEl: null,
    themeEl: null,
    panelObserver: null,
    getUrl() { try { return localStorage.getItem('yapplus.bg.url') || ''; } catch (e) { return ''; } },
    setUrl(v) { try { localStorage.setItem('yapplus.bg.url', v); } catch (e) {} this.apply(); },
    getOpacity() {
      const v = parseFloat(localStorage.getItem('yapplus.bg.opacity'));
      if (isNaN(v)) return 0.5;
      return Math.min(1, Math.max(0, v));
    },
    setOpacity(v) { try { localStorage.setItem('yapplus.bg.opacity', String(v)); } catch (e) {} this.apply(); },
    getThemeCss() { try { return localStorage.getItem('yapplus.bg.themecss') || ''; } catch (e) { return ''; } },
    setThemeCss(v) { try { localStorage.setItem('yapplus.bg.themecss', v); } catch (e) {} this.applyTheme(); },
    start() {
      this.injectCss();
      this.apply();
      this.applyTheme();
      this.observePanel();
      console.log('custom fucking background');
    },
    stop() {
      if (this.cssEl) { this.cssEl.remove(); this.cssEl = null; }
      if (this.themeEl) { this.themeEl.remove(); this.themeEl = null; }
      if (this.panelObserver) { this.panelObserver.disconnect(); this.panelObserver = null; }
      document.documentElement.classList.remove('ypp-bg-active');
      const root = document.documentElement.style;
      root.removeProperty('--ypp-bg-image');
      root.removeProperty('--ypp-bg-overlay');
      const settings = document.getElementById('ypp-bg-settings');
      if (settings) settings.remove();
      console.log('[Custom Background] disarmed');
    },
    injectCss() {
      if (this.cssEl || document.getElementById('ypp-bg-css')) return;
      const css = document.createElement('style');
      css.id = 'ypp-bg-css';
      css.textContent = `
        :root {
          --ypp-bg-image: none;
          --ypp-bg-overlay: transparent;
        }
        html.ypp-bg-active .app {
          background-image: linear-gradient(var(--ypp-bg-overlay), var(--ypp-bg-overlay)), var(--ypp-bg-image) !important;
          background-size: cover !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
          background-attachment: fixed !important;
          background-color: #141519 !important;
        }
        html.ypp-bg-active nav.rail,
        html.ypp-bg-active aside.sidebar,
        html.ypp-bg-active aside.side-panel,
        html.ypp-bg-active main.main,
        html.ypp-bg-active .chat-wrap,
        html.ypp-bg-active .chat,
        html.ypp-bg-active .messages,
        html.ypp-bg-active .messages-inner,
        html.ypp-bg-active .main-head {
          background-color: transparent !important;
          background-image: none !important;
        }
        html.ypp-bg-active .user-bar {
          background-color: #141519 !important;
          background-image: none !important;
        }
        html.ypp-bg-active .composer-box,
        html.ypp-bg-active .invite-embed {
          background-color: #1e1f22 !important;
          background-image: none !important;
        }
        /* OH MY MOTHERFUCKING GODDDD THIS FUCKING PIECE OF FUCKING SHIT TOOK FUCKING HALF A HOUR TO FIX FUCK YOUUUU*/
        html.ypp-bg-active .overlay {
          background-color: rgba(0, 0, 0, 0.6) !important; 
          backdrop-filter: blur(2px) !important;
        }
        html.ypp-bg-active .modal,
        html.ypp-bg-active .settings,
        html.ypp-bg-active .settings-nav,
        html.ypp-bg-active .settings-main,
        html.ypp-bg-active [role="dialog"],
        html.ypp-bg-active [role="menu"],
        html.ypp-bg-active .popout,
        html.ypp-bg-active .profile-card {
          background-color: #141519 !important;
          background-image: none !important;
        }
        html.ypp-bg-active .settings-main .input,
        html.ypp-bg-active .settings-main .btn.ghost {
          background-color: #1e1f22 !important;
        }
      `;
      (document.head || document.documentElement).appendChild(css);
      this.cssEl = css;
    },

    applyTheme() {
      if (!this.themeEl) {
        this.themeEl = document.createElement('style');
        this.themeEl.id = 'ypp-custom-theme-css';
        (document.head || document.documentElement).appendChild(this.themeEl);
      }
      this.themeEl.textContent = this.getThemeCss();
    },

    apply() {
      const url = this.getUrl().trim();
      const op = this.getOpacity();
      const alpha = Math.max(0, Math.min(1, 1 - op));
      const overlay = 'rgba(20, 21, 25, ' + alpha.toFixed(3) + ')';
      const root = document.documentElement;
      if (url) {
        root.style.setProperty('--ypp-bg-image', 'url("' + url.replace(/"/g, '\\"') + '")');
        root.style.setProperty('--ypp-bg-overlay', overlay);
        root.classList.add('ypp-bg-active');
      } else {
        root.classList.remove('ypp-bg-active');
        root.style.setProperty('--ypp-bg-image', 'none');
        root.style.setProperty('--ypp-bg-overlay', 'transparent');
      }
    },

    observePanel() {
      if (this.panelObserver) { this.panelObserver.disconnect(); this.panelObserver = null; }
      const self = this;
      const inject = () => {
        const panel = document.getElementById('yapplus-plugin-settings-panel');
        if (panel && !panel.querySelector('#ypp-bg-settings')) {
          self.injectSettings(panel);
        }
      };
      inject();
      this.panelObserver = new MutationObserver(inject);
      this.panelObserver.observe(document.body, { childList: true, subtree: true });
    },

    injectSettings(panel) {
      const section = document.createElement('div');
      section.className = 'yp-section';
      section.id = 'ypp-bg-settings';
      const self = this;

      section.innerHTML =
        '<h3>Custom Background</h3>' +
        '<p style="font-size:12px;color:#949ba4;margin:0 0 8px;">Paste a direct image link and pick how see-through it is.</p>' +
        '<input id="ypp-bg-url" type="text" placeholder="https://example.com/image.png" autocomplete="off" class="yp-input" style="margin-bottom:10px;">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">' +
          '<span style="font-size:12px;color:#949ba4;flex-shrink:0;">Opacity</span>' +
          '<input id="ypp-bg-opacity" type="range" min="0" max="100" step="1" style="flex:1;">' +
          '<span id="ypp-bg-opacity-val" style="font-size:12px;color:#e27ed3;width:42px;text-align:right;">50%</span>' +
        '</div>' +
        '<p style="font-size:12px;color:#949ba4;margin:0 0 6px;">Custom CSS theme; gets injected on top of everything (don\'t blow up yapper lol)</p>' +
        '<textarea id="ypp-bg-themecss" rows="8" placeholder=".msg-author { color: hotpink !important; }" autocomplete="off" spellcheck="false" ' +
          'style="width:100%;background:#1e1f22;border:1px solid #3f4147;border-radius:6px;color:#dbdee1;padding:8px 10px;font-size:13px;font-family:monospace;outline:none;box-sizing:border-box;resize:vertical;line-height:1.5;white-space:pre;overflow-wrap:normal;overflow-x:auto;tab-size:2;"></textarea>' +
        '<p id="ypp-bg-css-status" style="font-size:11px;color:#949ba4;margin:4px 0 0;min-height:16px;"></p>';

      panel.appendChild(section);

      const urlInput = section.querySelector('#ypp-bg-url');
      const opInput = section.querySelector('#ypp-bg-opacity');
      const opVal = section.querySelector('#ypp-bg-opacity-val');
      const cssInput = section.querySelector('#ypp-bg-themecss');
      const cssStatus = section.querySelector('#ypp-bg-css-status');

      urlInput.value = self.getUrl();
      opInput.value = String(Math.round(self.getOpacity() * 100));
      opVal.textContent = opInput.value + '%';
      cssInput.value = self.getThemeCss();

      urlInput.addEventListener('input', function () { self.setUrl(urlInput.value); });
      opInput.addEventListener('input', function () {
        self.setOpacity(parseInt(opInput.value, 10) / 100);
        opVal.textContent = opInput.value + '%';
      });
      cssInput.addEventListener('input', function () {
        self.setThemeCss(cssInput.value);
        cssStatus.textContent = 'CSS applied!';
        setTimeout(function () { cssStatus.textContent = ''; }, 1500);
      });
      cssInput.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = cssInput.selectionStart;
          const end = cssInput.selectionEnd;
          cssInput.value = cssInput.value.substring(0, start) + '  ' + cssInput.value.substring(end);
          cssInput.selectionStart = cssInput.selectionEnd = start + 2;
        }
      });
    },
};

window.custombackground = custombackground;
window.PluginHost.register(custombackground);