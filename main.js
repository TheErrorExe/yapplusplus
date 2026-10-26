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
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            if (file.endsWith('.js') && !seen.has(file)) {
                seen.add(file);
                try {
                    const code = fs.readFileSync(path.join(dir, file), 'utf-8');
                    combinedCode += `\n// [Libyapcore] [P.L]> ${file} >.<\n`;
                    combinedCode += code + '\n';
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
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            if (file.endsWith('.css') && !themes[file]) {
                try {
                    themes[file] = fs.readFileSync(path.join(dir, file), 'utf-8');
                } catch (e) {}
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
    const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/master?recursive=1`;

    try {
        const response = await fetch(githubApiUrl, {
            headers: { 'User-Agent': 'YapPlusPlus-App' }
        });
        if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
        
        const treeData = await response.json();
        let updatedCount = 0;
        const validPaths = new Set();

        const SAFE_PATHS = /^(main\.js|preload\.js|html\/client\.html|assets\/.*|plugins\/.*|themes\/.*)$/;
        const TEXT_EXT = /\.(js|css|html|json|md|txt)$/i;

        for (const file of treeData.tree || []) {
            if (file.type !== 'blob' || !SAFE_PATHS.test(file.path)) continue;
            
            validPaths.add(file.path);
            const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/master/${file.path}`;
            const localPath = path.join(hotDir, file.path);

            const rawRes = await fetch(rawUrl);
            let isDifferent = false;
            let remoteBuffer = null;

            if (TEXT_EXT.test(file.path)) {
                const remoteText = await rawRes.text();
                if (!fs.existsSync(localPath) || fs.readFileSync(localPath, 'utf-8') !== remoteText) {
                    isDifferent = true;
                    remoteBuffer = remoteText;
                }
            } else {
                const remoteArrayBuffer = await rawRes.arrayBuffer();
                remoteBuffer = Buffer.from(remoteArrayBuffer);
                if (!fs.existsSync(localPath) || !fs.readFileSync(localPath).equals(remoteBuffer)) {
                    isDifferent = true;
                }
            }

            if (isDifferent) {
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