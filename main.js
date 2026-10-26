const { app, BrowserWindow, ipcMain, Menu } = require('electron');
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

async function update() {
    const repoOwner = 'salami-reborn';
    const repoName = 'yapplusplus';

    async function fetchRecursive(path) {
        const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'YapPlusPlus-App' } });
        if (!res.ok) return [];
        const items = await res.json();
        let files = [];
        
        for (const item of items) {
            if (item.type === 'file') {
                if (/^(app\.js|main\.js|preload\.js|html\/client\.html|assets\/.*|plugins\/.*|themes\/.*)$/.test(item.path)) {
                    files.push(item);
                }
            } else if (item.type === 'dir') {
                if (/^(assets|plugins|themes|html)$/.test(item.path)) {
                    const subFiles = await fetchRecursive(item.path);
                    files = files.concat(subFiles);
                }
            }
        }
        return files;
    }

    try {
        const files = await fetchRecursive('');
        let updatedCount = 0;
        const validPaths = new Set();

        for (const file of files) {
            validPaths.add(file.path);
            const localPath = path.join(hotDir, file.path);
            const res = await fetch(file.url, { headers: { 'User-Agent': 'YapPlusPlus-App' } });
            if (!res.ok) continue;
            const data = await res.json();

            if (data.type !== 'file') continue;
            const remoteBuffer = Buffer.from(data.content, 'base64');
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

    mainWindow.loadFile(clientPath);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});