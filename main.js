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
                return('fuck');
            }
        }
    });
    return combinedCode;
}

ipcMain.handle('get-plugins', () => {
    return getPluginCode();
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

    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'assets', 'Icon.ico'),
        webPreferences: {
            webviewTag: true, 
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }

    });
    
    mainWindow.loadFile(path.join(__dirname, 'html', 'client.html'));
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});