(function () {
  if (window.__yapplusmenuinstalled) return;
  window.__yapplusmenuinstalled = true;
  const navid = 'yapplus-nav-button';
  const navsettingsid = 'yapplus-nav-settings-button';
  const panelid = 'yapplus-panel';
  const settingspanelid = 'yapplus-plugin-settings-panel';
  const style = document.createElement('style');


  
  style.textContent = `
    #${navid}, #${navsettingsid} { color: #e27ed3; }
    #${panelid}, #${settingspanelid} { padding: 28px 40px; color: #dbdee1; line-height: 1.5; }
    #${panelid} h2, #${settingspanelid} h2 { margin: 0 0 18px; font-size: 20px; color: #fff; }
    #${panelid} a, #${settingspanelid} a { color: #e27ed3; text-decoration: none; }
    #${panelid} a:hover, #${settingspanelid} a:hover { text-decoration: underline; }
    #${panelid} .yp-section, #${settingspanelid} .yp-section { margin-bottom: 24px; }
    #${panelid} .yp-section h3, #${settingspanelid} .yp-section h3 {
      font-size: 12px; text-transform: uppercase; letter-spacing: .04em;
      color: #b5bac1; margin: 0 0 10px;
    }
    .yp-switch {
      position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0;
    }
    .yp-switch input { opacity: 0; width: 0; height: 0; }
    .yp-slider {
      position: absolute; inset: 0; background: #4e5058; border-radius: 22px;
      transition: background .15s; cursor: pointer;
    }
    .yp-slider::before {
      content: ""; position: absolute; width: 16px; height: 16px;
      left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform .15s;
    }
    .yp-switch input:checked + .yp-slider { background: #e27ed3; }
    .yp-switch input:checked + .yp-slider::before { transform: translateX(18px); }
    .yp-plugin-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 0; border-bottom: 1px solid #2b2d31;
    }
    .yp-plugin-row:last-child { border-bottom: none; }
    .yp-plugin-name { font-weight: 600; color: #fff; }
    .yp-plugin-desc { font-size: 12px; color: #949ba4; margin-top: 2px; }
    .yp-input {
      width: 100%; background: #1e1f22; border: 1px solid #3f4147; border-radius: 6px;
      color: #dbdee1; padding: 8px 10px; font-size: 14px; outline: none; box-sizing: border-box;
    }
    .yp-type-tag {
      display: inline-flex; align-items: center; gap: 5px;
      background: #2b2d31; border: 1px solid #3f4147; border-radius: 6px;
      padding: 4px 8px; font-size: 12px; color: #dbdee1; margin: 3px;
    }
    .yp-type-tag button {
      background: none; border: none; color: #949ba4; cursor: pointer;
      font-size: 14px; line-height: 1; padding: 0; display: flex; align-items: center;
    }
    .yp-type-tag button:hover { color: #ff4b4b; }
    .yp-tags-wrap { display: flex; flex-wrap: wrap; margin-bottom: 8px; min-height: 32px; }
  `;
  document.head.appendChild(style);

  function buildpanel() {
    const p = document.createElement('div');
    p.id = panelid;
    p.innerHTML = `
      <h1>😼 Yap++ </h1>
      <h2>The <b>Cutest</b> Client mod for yapper</h2>
      <p style="color: pink;">Tester build</p>
      <hr>
      <p></p>
      <div class="yp-section">
        <h3>Plugins</h3>
        <div id="yapplus-plugin-list"></div>
      </div>
      <hr>
      <div class="yp-section">
        <h3>About</h3>
        <p>Thank you for using Yap++ 😼</p>
        <p>Yapper: <b>salami</b></p>
        <p>YouTube: <a href="https://www.youtube.com/@sedesuu" target="_blank">@sedesuu</a></p>
        <p>Discord: <a href="https://discord.com/users/1384802116106719384" target="_blank">.salamidev</a></p>
        <p>Thank you to our biggest helper and Co-Owner too;</p>
        <p>I'm ofcourse talking about the goat @Lemon 🥹</p>
        <hr>
        <p></p>
        <div class="yp-section">
          <h3>Ethics</h3>
          <p>Yap++ Does <b>not</b> Save, Distribute, Or maliciously use your login tokens/login information. We want @Antic to notice and support us!</p>
        </div>
      </div>
    `;
    const list = p.querySelector('#yapplus-plugin-list');
    function render() {
      list.innerHTML = '';
      window.PluginHost.all().forEach(plugin => {
        const row = document.createElement('div');
        row.className = 'yp-plugin-row';
        const info = document.createElement('div');
        info.innerHTML = `
          <div class="yp-plugin-name">${plugin.name}</div>
          <div class="yp-plugin-desc">${plugin.description || ''}</div>
        `;
        const label = document.createElement('label');
        label.className = 'yp-switch';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = window.PluginHost.isEnabled(plugin);
        const slider = document.createElement('span');
        slider.className = 'yp-slider';
        label.appendChild(input);
        label.appendChild(slider);
        input.addEventListener('change', () => { window.PluginHost.setEnabled(plugin, input.checked); });
        row.appendChild(info);
        row.appendChild(label);
        list.appendChild(row);
      });
    }
    render();
    window.PluginHost.onChange(render);
    return p;
  }
  function buildsettingspanel() {
    const p = document.createElement('div');
    p.id = settingspanelid;
    p.innerHTML = `
      <h1>⛩️ Plugin Settings</h1>
      <h2>Settings for yap++ plugins</h2>
      <hr>
      <p></p>
    `;
    const aesection = document.createElement('div');
    aesection.className = 'yp-section';
    aesection.innerHTML = `
      <h3>Auto Edit</h3>
      <p style="font-size:12px;color:#949ba4;margin:0 0 8px;">Type the command and it get's autoreplaced!!!</p>
      <input id="yapplus-ae-cmd" type="text" placeholder="/command" autocomplete="off" class="yp-input" style="margin-bottom:8px;">
      <input id="yapplus-ae-text" type="text" placeholder="text" autocomplete="off" class="yp-input">
    `;
    p.appendChild(aesection);
    const aecmd = aesection.querySelector('#yapplus-ae-cmd');
    const aetext = aesection.querySelector('#yapplus-ae-text');
    try {
      aecmd.value = localStorage.getItem('yapplus.autoedit.cmd') || '';
      aetext.value = localStorage.getItem('yapplus.autoedit.text') || '';
    } catch (e) {}
    aecmd.addEventListener('input', () => { try { localStorage.setItem('yapplus.autoedit.cmd', aecmd.value); } catch (e) {} });
    aetext.addEventListener('input', () => { try { localStorage.setItem('yapplus.autoedit.text', aetext.value); } catch (e) {} });

    const alltypes = [
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'text/plain',
    ];

    const fdsection = document.createElement('div');
    fdsection.className = 'yp-section';
    fdsection.id = 'ypp-fd-settings';
    fdsection.innerHTML = `
      <h3>Filename Disguiser</h3>
      <p style="font-size:12px;color:#949ba4;margin:0 0 10px;">Choose which file extensions (or filetypes) get their names randomized on upload. Click a tag to toggle it</p>
      <div class="yp-tags-wrap" id="ypp-fd-tags"></div>
      <div style="display:flex;gap:8px;margin-bottom:6px;">
        <input id="ypp-fd-custom" type="text" placeholder="example: image/bmp" autocomplete="off"
          style="flex:1;background:#1e1f22;border:1px solid #3f4147;border-radius:6px;color:#dbdee1;padding:6px 10px;font-size:13px;outline:none;">
        <button id="ypp-fd-add" style="background:#e27ed3;border:none;border-radius:6px;color:#fff;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;">Add type</button>
      </div>
    `;
    p.appendChild(fdsection);
    const tagswrap = fdsection.querySelector('#ypp-fd-tags');
    const custominput = fdsection.querySelector('#ypp-fd-custom');
    const addbtn = fdsection.querySelector('#ypp-fd-add');
    function gettypes() { 
        return window.filenamedisguiser ? window.filenamedisguiser.getenabledtypes() : []; 
    }
    function savetypes(arr) { 
        if (window.filenamedisguiser) window.filenamedisguiser.setenabledtypes(arr); 
    }

    function getallknown() {
      const enabled = gettypes();
      const extras = enabled.filter(t => !alltypes.includes(t));
      return alltypes.concat(extras);
    }

    function rendertags() {
      tagswrap.innerHTML = '';
      const enabled = gettypes();
      getallknown().forEach(type => {
        const on = enabled.includes(type);
        const tag = document.createElement('span');
        tag.className = 'yp-type-tag';
        tag.style.borderColor = on ? '#e27ed3' : '#3f4147';
        tag.style.color = on ? '#e27ed3' : '#949ba4';
        tag.style.cursor = 'pointer';
        const label = document.createElement('span');
        label.textContent = type;
        tag.addEventListener('click', function () {
          const cur = gettypes();
          if (cur.includes(type)) savetypes(cur.filter(t => t !== type));
          else savetypes(cur.concat([type]));
          rendertags();
        });
        tag.appendChild(label);
        if (!alltypes.includes(type)) {
          const removebtn = document.createElement('button');
          removebtn.innerHTML = '×';
          removebtn.title = 'Remove type';
          removebtn.addEventListener('click', function (e) {
            e.stopPropagation();
            savetypes(gettypes().filter(t => t !== type));
            rendertags();
          });
          tag.appendChild(removebtn);
        }
        tagswrap.appendChild(tag);
      });
    }
    rendertags();
    addbtn.addEventListener('click', function () {
      const v = custominput.value.trim().toLowerCase();
      if (!v || !v.includes('/')) return;
      const cur = gettypes();
      if (!cur.includes(v)) savetypes(cur.concat([v]));
      custominput.value = '';
      rendertags();
    });
    custominput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addbtn.click();
    });
    const cbsection = document.createElement('div');
    cbsection.className = 'yp-section';
    cbsection.id = 'ypp-cb-settings';
    cbsection.innerHTML = `
      <h3>Custom Background</h3>
      <p style="font-size:12px;color:#949ba4;margin:0 0 8px;">Paste a direct image link and pick how see-through it is.</p>
      <input id="ypp-bg-url" type="text" placeholder="https://example.com/image.png" autocomplete="off" class="yp-input" style="margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span style="font-size:12px;color:#949ba4;flex-shrink:0;">Opacity</span>
        <input id="ypp-bg-opacity" type="range" min="0" max="100" step="1" style="flex:1;">
        <span id="ypp-bg-opacity-val" style="font-size:12px;color:#e27ed3;width:42px;text-align:right;">50%</span>
      </div>
      <p style="font-size:12px;color:#949ba4;margin:0 0 6px;">Custom CSS theme; gets injected on top of everything (don't blow up yapper lol)</p>
      <textarea id="ypp-bg-themecss" rows="8" placeholder=".msg-author { color: hotpink !important; }" autocomplete="off" spellcheck="false" style="width:100%;background:#1e1f22;border:1px solid #3f4147;border-radius:6px;color:#dbdee1;padding:8px 10px;font-size:13px;font-family:monospace;outline:none;box-sizing:border-box;resize:vertical;line-height:1.5;white-space:pre;overflow-wrap:normal;overflow-x:auto;tab-size:2;"></textarea>
      <p id="ypp-bg-css-status" style="font-size:11px;color:#949ba4;margin:4px 0 0;min-height:16px;"></p>
    `;
    p.appendChild(cbsection);
    const urlinput = cbsection.querySelector('#ypp-bg-url');
    const opinput = cbsection.querySelector('#ypp-bg-opacity');
    const opval = cbsection.querySelector('#ypp-bg-opacity-val');
    const cssinput = cbsection.querySelector('#ypp-bg-themecss');
    const cssstatus = cbsection.querySelector('#ypp-bg-css-status');
    if (window.custombackground) {
      urlinput.value = window.custombackground.geturl();
      opinput.value = String(Math.round(window.custombackground.getopacity() * 100));
      opval.textContent = opinput.value + '%';
      cssinput.value = window.custombackground.getthemecss();

      urlinput.addEventListener('input', function () { window.custombackground.seturl(urlinput.value); });
      opinput.addEventListener('input', function () {
        window.custombackground.setopacity(parseInt(opinput.value, 10) / 100);
        opval.textContent = opinput.value + '%';
      });
      cssinput.addEventListener('input', function () {
        window.custombackground.setthemecss(cssinput.value);
        cssstatus.textContent = 'CSS applied!';
        setTimeout(function () { cssstatus.textContent = ''; }, 1500);
      });
      cssinput.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = cssinput.selectionStart;
          const end = cssinput.selectionEnd;
          cssinput.value = cssinput.value.substring(0, start) + '  ' + cssinput.value.substring(end);
          cssinput.selectionStart = cssinput.selectionEnd = start + 2;
        }
      });
    } else {
      urlinput.disabled = true;
      opinput.disabled = true;
      cssinput.disabled = true;
      urlinput.placeholder = "Plugin not loaded";
    }

    return p;
  }
  function inject() {
    if (document.getElementById(navid)) return;
    const nav = document.querySelector('.settings-nav');
    const main = document.querySelector('.settings-main');
    if (!nav || !main) return;
    const btn = document.createElement('button');
    btn.id = navid;
    btn.textContent = '😼 Yap++';
    btn.addEventListener('click', () => {
      nav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      main.innerHTML = '';
      main.appendChild(buildpanel());
    });
    nav.appendChild(btn);
    const settingsbtn = document.createElement('button');
    settingsbtn.id = navsettingsid;
    settingsbtn.textContent = '⛩️ Yap++ Settings';
    settingsbtn.addEventListener('click', () => {
      nav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      settingsbtn.classList.add('active');
      main.innerHTML = '';
      const sp = buildsettingspanel();
      main.appendChild(sp);
    });
    nav.appendChild(settingsbtn);
    console.log('[Libyapcore] [I]> 😼 Yap++ is HEREEEE BABEYYYY');
  }

  new MutationObserver(inject).observe(document.body, { childList: true, subtree: true });
  inject();
})();