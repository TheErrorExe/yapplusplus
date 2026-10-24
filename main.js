const {app, BrowserWindow} = require('electron')

app.WhenReady().then(() => {
    const setupwindow = new BrowserWindow();

    setupwindow.focusOnWebView('https://yapper.website')
})