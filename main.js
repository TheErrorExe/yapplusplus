const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const hotDir = process.env.YAPPLUS_HOT_DIR;
const appDir = process.env.YAPPLUS_APP_DIR;





ipcMain.handle('save-custom-plugin', async (event, filename, code) => {
    try {
        if (!filename.endsWith('.js')) filename += '.js';
        const pluginsHotDir = path.join(hotDir, 'plugins');
        if (!fs.existsSync(pluginsHotDir)) {
            fs.mkdirSync(pluginsHotDir, { recursive: true });
        }  
        const filePath = path.join(pluginsHotDir, filename);
        fs.writeFileSync(filePath, code, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
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
ipcMain.handle('get-plugins', () => {
    return getPluginCode();
});
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

ipcMain.handle('get-themes', () => {
    return getThemeCode();
});

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

async function update() { // fuckass update system dont get me wrong this shit sucks
    const repoOwner = 'salami-reborn';
    const repoName = 'yapplusplus'

    try {
        const repoInfoRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
            headers: { 'User-Agent': 'YapPlusPlus-App' } // will it work? ts is the equivelent of calling her mommy
        });
        if (!repoInfoRes.ok) throw new Error(`OMFG GITHUB SHUT YOUR ASS UP.. anyway.. ${repoInfoRes.status}`);
        
        const repoInfo = await repoInfoRes.json();
        const branch = repoInfo.default_branch;
        const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/${branch}?recursive=1`;
        const response = await fetch(githubApiUrl, {
            headers: { 'User-Agent': 'YapPlusPlus-App' }
        });
        if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
        const treeData = await response.json();
        let updatedCount = 0;
        const validPaths = new Set();
        const SAFE_PATHS = /^(main\.js|app\.js|preload\.js|html\/client\.html|assets\/.*|plugins\/.*|themes\/.*)$/;
        for (const file of treeData.tree || []) {
            if (file.type !== 'blob' || !SAFE_PATHS.test(file.path)) continue;    
            validPaths.add(file.path);
            const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${file.path}`;
            const localPath = path.join(hotDir, file.path);
            const rawRes = await fetch(rawUrl);
            const remoteContent = await rawRes.text();




            let needsUpdate = false;
            if (!fs.existsSync(localPath)) {
                needsUpdate = true;
            } else {
                const localContent = fs.readFileSync(localPath, 'utf-8');
                if (localContent !== remoteContent) needsUpdate = true;
            }




            if (needsUpdate) {
                fs.mkdirSync(path.dirname(localPath), { recursive: true });
                fs.writeFileSync(localPath, remoteContent, 'utf-8');
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

ipcMain.handle('update', async () => {
    return await update();
});

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