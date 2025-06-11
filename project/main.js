const { app, BrowserWindow, ipcMain, Menu } = require("electron")
const path = require("path")
const isDev = process.env.NODE_ENV === "development"

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, "assets/icon.png"),
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0a0a0a",
    show: false,
  })

  mainWindow.loadFile("renderer/index.html")

  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
    if (isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })

  // Menu personnalisé
  const template = [
    {
      label: "Alien Labyrinth",
      submenu: [{ role: "about", label: "À propos" }, { type: "separator" }, { role: "quit", label: "Quitter" }],
    },
    {
      label: "Édition",
      submenu: [
        { role: "undo", label: "Annuler" },
        { role: "redo", label: "Rétablir" },
        { type: "separator" },
        { role: "cut", label: "Couper" },
        { role: "copy", label: "Copier" },
        { role: "paste", label: "Coller" },
      ],
    },
    {
      label: "Affichage",
      submenu: [
        { role: "reload", label: "Actualiser" },
        { role: "forceReload", label: "Forcer l'actualisation" },
        { role: "toggleDevTools", label: "Outils de développement" },
        { type: "separator" },
        { role: "resetZoom", label: "Zoom normal" },
        { role: "zoomIn", label: "Zoom avant" },
        { role: "zoomOut", label: "Zoom arrière" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Plein écran" },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC handlers pour la communication avec le renderer
ipcMain.handle("get-app-version", () => {
  return app.getVersion()
})
