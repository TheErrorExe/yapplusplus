const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const fs = require('fs');
const path = require('path');






function getPluginCode() {
    const pluginsDir = path.join(__dirname, 'plugins');
    let combinedCode = '';
    if (!fs.existsSync(pluginsDir)) {
        return '';
    }
    const files = fs.readdirSync(pluginsDir);
    files.forEach(file => {
        if (file.endsWith('.js')) {
            try {
                const code = fs.readFileSync(path.join(pluginsDir, file), 'utf-8');
                combinedCode += `\n// [Libyapcore] [P.L]> ${file} >.<\n`;
                combinedCode += code + '\n';
            } catch (e) {
            }
        }
    });
    return combinedCode;
}
ipcMain.handle('get-plugins', () => {
    return getPluginCode();
});






async function update() {
    const pluginsDir = path.join(__dirname, 'plugins');
    const repoOwner = 'salami-reborn';
    const repoName = 'yapplusplus';
    const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/plugins`;
    try {
        const response = await fetch(githubApiUrl, {
            headers: { 'User-Agent': 'YapPlusPlus-App' }
        });
        if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
        const remoteFiles = await response.json();
        let updatedCount = 0;
        for (const file of remoteFiles) {
            if (file.type === 'file' && file.name.endsWith('.js')) {
                const localPath = path.join(pluginsDir, file.name);
                let needsUpdate = false;
                if (!fs.existsSync(localPath)) {
                    needsUpdate = true;
                } else {
                    const localContent = fs.readFileSync(localPath, 'utf-8');
                    const rawRes = await fetch(file.download_url);
                    const remoteContent = await rawRes.text();
                    if (localContent !== remoteContent) {
                        needsUpdate = true;
                    }
                }
                if (needsUpdate) {
                    const rawRes = await fetch(file.download_url);
                    const code = await rawRes.text();
                    fs.writeFileSync(localPath, code, 'utf-8');
                    updatedCount++;
                }
            }
        }
        return { success: true, count: updatedCount };
    } catch (error) {
        console.error('[Libyapcore] [E]> Plugin update failed:', error);
        return { success: false, error: error.message };
    }
}
ipcMain.handle('update', async () => {
    return await update();
});
ipcMain.handle('get-asset', (event, assetName) => {
    try {
        const assetPath = path.join(__dirname, 'assets', assetName);
        const bitmap = fs.readFileSync(assetPath);
        const base64 = Buffer.from(bitmap).toString('base64');
        const ext = path.extname(assetName).toLowerCase();
        let mime = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
        if (ext === '.gif') mime = 'image/gif';
        if (ext === '.webp') mime = 'image/webp';
        return `data:${mime};base64,${base64}`;
    } catch (e) {
        console.error(`[Libyapcore] [E]> Failed to load asset ${assetName}:`, e);
        return null;
    }
});
app.whenReady().then(() => {
    Menu.setApplicationMenu(null);

    const preloadPath = path.join(__dirname, 'preload.js').replace(/\\/g, '/');

    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'assets', 'Icon.ico'),
        webPreferences: {
            webviewTag: true, 
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            additionalArguments: [`--preload-path=${preloadPath}`]
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'html', 'client.html'));
});







app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});