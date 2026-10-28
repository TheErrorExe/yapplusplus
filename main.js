const { app, BrowserWindow, ipcMain, Menu, shell, desktopCapturer, session } = require('electron');
const { shell } = require('electron');
const fs = require('fs');
const path = require('path');
const hotDir = process.env.YAPPLUS_HOT_DIR;
const appDir = process.env.YAPPLUS_APP_DIR;








function resolve(relPath) {
    if (hotDir) {
        const hotPath = path.join(hotDir, relPath);
        if (fs.existsSync(hotPath)) return hotPath;
    }
    return path.join(appDir, relPath);
}


mainWindow.webContents.setWindowOpenHandler(({ url }) => {
  if (url.startsWith('http:') || url.startsWith('https:')) {
    shell.openExternal(url);
    return { action: 'deny' };
  }
  return { action: 'allow' };
});

function getPluginCode() {
    const dirs = [
        hotDir ? path.join(hotDir, 'plugins') : null,
        path.join(appDir, 'plugins')
    ].filter(Boolean);
    const seen = new Set();
    let combinedCode = '';
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue;
        fs.readdirSync(dir).forEach(file => {
            if (file.endsWith('.js') && !seen.has(file)) {
                seen.add(file);
                try {
                    combinedCode += `\n// [Libyapcore] [P.L]> ${file} >.<\n`;
                    combinedCode += fs.readFileSync(path.join(dir, file), 'utf-8') + '\n';
                } catch (e) {}
            }
        });
    }
    return combinedCode;
}



function getThemeCode() {
    const dirs = [
        hotDir ? path.join(hotDir, 'themes') : null,
        path.join(appDir, 'themes')
    ].filter(Boolean);
    const themes = {};
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue;
        fs.readdirSync(dir).forEach(file => {
            if (file.endsWith('.css') && !themes[file]) {
                try { themes[file] = fs.readFileSync(path.join(dir, file), 'utf-8'); } catch (e) {}
            }
        });
    }
    return themes;
}

ipcMain.handle('get-plugins', () => getPluginCode());
ipcMain.handle('get-themes', () => getThemeCode());
ipcMain.handle('get-asset', (event, assetName) => {



    const candidates = [
        hotDir ? path.join(hotDir, 'assets', assetName) : null,
        path.join(appDir, 'assets', assetName)
    ].filter(Boolean);
    for (const assetPath of candidates) {
        if (fs.existsSync(assetPath)) {
            try {
                const bitmap = fs.readFileSync(assetPath);
                const base64 = Buffer.from(bitmap).toString('base64');
                const ext = path.extname(assetName).toLowerCase();
                let mime = 'image/png';
                if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
                if (ext === '.gif') mime = 'image/gif';
                if (ext === '.webp') mime = 'image/webp';
                return `data:${mime};base64,${base64}`;
            } catch (e) {}
        }
    }
    return null;


});

ipcMain.handle('save-custom-plugin', async (event, filename, code) => {
    try {
        if (!filename.endsWith('.js')) filename += '.js';
        const pluginsHotDir = path.join(hotDir, 'plugins');
        if (!fs.existsSync(pluginsHotDir)) fs.mkdirSync(pluginsHotDir, { recursive: true });
        fs.writeFileSync(path.join(pluginsHotDir, filename), code, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('open-external', async (event, url) => {
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

async function update() {
    const repoOwner = 'salami-reborn';
    const repoName = 'yapplusplus';
    const branch = 'main';

    try {
        const treeUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/${branch}?recursive=1`;
        const response = await fetch(treeUrl, { headers: { 'User-Agent': 'YapPlusPlus-App' } });
        
        if (!response.ok) {
            if (response.status === 403 || response.status === 404) {
                throw new Error(`GitHub API returned ${response.status}. You may have hit the API rate limit (60 req/hr). Try again later.`);
            }
            throw new Error(`GitHub API returned ${response.status}`);
        }
        
        const treeData = await response.json();
        let updatedCount = 0;
        const validPaths = new Set();

        const SAFE_PATHS = /^(app\.js|main\.js|preload\.js|html\/client\.html|assets\/.*|plugins\/.*|themes\/.*)$/;

        for (const file of treeData.tree || []) {
            if (file.type !== 'blob' || !SAFE_PATHS.test(file.path)) continue;
            
            validPaths.add(file.path);
            const localPath = path.join(hotDir, file.path);
            const blobUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/blobs/${file.sha}`;
            const blobRes = await fetch(blobUrl, { headers: { 'User-Agent': 'YapPlusPlus-App' } });
            if (!blobRes.ok) continue;

            const blobData = await blobRes.json();
            if (blobData.encoding !== 'base64') continue;
            const remoteBuffer = Buffer.from(blobData.content, 'base64');

            let needsUpdate = false;
            if (!fs.existsSync(localPath)) {
                needsUpdate = true;
            } else {
                const localBuffer = fs.readFileSync(localPath);
                if (!localBuffer.equals(remoteBuffer)) {
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                fs.mkdirSync(path.dirname(localPath), { recursive: true });
                fs.writeFileSync(localPath, remoteBuffer);
                updatedCount++;
            }
        }

        function cleanDir(dir) {
            if (!fs.existsSync(dir)) return;
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const relPath = path.relative(hotDir, fullPath).replace(/\\/g, '/');
                if (fs.statSync(fullPath).isDirectory()) {
                    cleanDir(fullPath);
                } else if (!validPaths.has(relPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
        }
        cleanDir(hotDir);

        return { success: true, count: updatedCount };
    } catch (error) {
        console.error('[Libyapcore] [E]> Update failed:', error);
        return { success: false, error: error.message };
    }
}

ipcMain.handle('update', async () => update());

ipcMain.handle('restart-app', () => {
    app.relaunch();
    app.exit(0);
});

app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    
    session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
        try {
            const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 } });
            
            const pickerWindow = new BrowserWindow({
                width: 800,
                height: 600,
                title: 'Select Screen to Share',
                autoHideMenuBar: true,
                alwaysOnTop: true,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                }
            });

            let sourcesData = sources.map(s => ({
                id: s.id,
                name: s.name,
                thumbnail: s.thumbnail.toDataURL()
            }));

            const html = `
                <html>
                <body style="background: #1e1f22; color: #dbdee1; font-family: sans-serif; padding: 20px;">
                    <h2 style="margin-top: 0;">Select a screen or window to share</h2>
                    <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                        ${sourcesData.map((s, i) => `
                            <div onclick="pick(${i})" style="cursor: pointer; text-align: center; width: 220px; padding: 10px; border-radius: 8px; background: #2b2d31;">
                                <img src="${s.thumbnail}" style="width: 100%; border-radius: 4px; border: 1px solid #111;" />
                                <div style="margin-top: 8px; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.name}</div>
                            </div>
                        `).join('')}
                    </div>
                    <script>
                        const { ipcRenderer } = require('electron');
                        window.pick = (i) => {
                            ipcRenderer.send('picked-screen', ${JSON.stringify(sourcesData)}[i]);
                        };
                    </script>
                </body>
                </html>
            `;
            pickerWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
            ipcMain.once('picked-screen', (event, picked) => {
                pickerWindow.close();
                if (!picked) {
                    callback({});
                    return;
                }
                
                const streams = { video: picked };
                if (request.audioRequested && process.platform === 'win32') {
                    streams.audio = 'loopback';
                }
                callback(streams);
            });
        
            pickerWindow.on('closed', () => {
                callback({});
            });

        } catch (err) {
            console.error('Screen picker failed:', err);
            callback({});
        }
    });
    const preloadPath = resolve('preload.js').replace(/\\/g, '/');
    const clientPath = resolve('html/client.html');

    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true,
        icon: path.join(appDir, 'assets', 'Icon.ico'),
        webPreferences: {
            webviewTag: true, 
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            additionalArguments: [`--preload-path=${preloadPath}`]
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.includes('yapper.website') || url.includes('yapin.gg')) {
            return { action: 'allow' };
        }
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.webContents.on('did-attach-webview', (event, wc) => {
        wc.executeJavaScript(`
            document.addEventListener('click', (e) => {
                const a = e.target.closest ? e.target.closest('a') : null;
                if (!a) return;
                const href = a.getAttribute('href');
                if (!href) return;
                
                if (href.startsWith('#') || href.startsWith('javascript:')) return;
                if (href.includes('yapper.website') || href.includes('yapin.gg')) return;

                if (href.startsWith('http://') || href.startsWith('https://')) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.electronAPI.openExternal(href);
                }
            }, true);
        `);

        wc.on('will-navigate', (event, url) => {
            if (!url.includes('yapper.website') && !url.includes('yapin.gg')) {
                event.preventDefault();
                shell.openExternal(url);
            }
        });
    });

    mainWindow.loadFile(clientPath);
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});