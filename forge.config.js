const { MakerNsis } = require("electron-forge-maker-nsis");
const { MakerAppImage } = require("electron-forge-maker-appimage");

// let me fucking rant about squirell for a fucking second
// i wanted to release this fucking abomination 
// i then fucking realized how fucking ass dogshit fuckass andrewtate squirel was.
// fuck you fuckass squirel, i fucking switched to nsis now, fuck you.

module.exports = {
  packagerConfig: {
    name: 'Yap++',
    icon: './assets/icon',
    asar: false,
    ignore: [
      /^\/\.git/,
      /^\/out/,
      /^\/build/,
      /^\/node_modules/,
      /^\/\.vscode/
    ].map(regex => (path) => regex.test(path) ? true : false),
  },
  rebuildConfig: {},
  makers: [
    new MakerNsis({
      oneClick: false,     
      perMachine: false,           
      allowToChangeInstallationDirectory: false,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: "Yap++"
    }),
    new MakerAppImage({ // fuck, i'll have to git clone it to wsl to build it as appimage ggs
      options: {
        categories: ["Utility"],        
        icon: "./assets/icon.png",      
        productName: "Yap++",           
        genericName: "Yapper client",  
    }
    })
  ]
};