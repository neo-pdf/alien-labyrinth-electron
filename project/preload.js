const { contextBridge, ipcRenderer } = require("electron")

// Exposer l'API au renderer process
contextBridge.exposeInMainWorld("api", {
  // Authentification
  login: (credentials) => ipcRenderer.invoke("auth:login", credentials),
  register: (userData) => ipcRenderer.invoke("auth:register", userData),

  // Labyrinthes
  createLabyrinth: (params) => ipcRenderer.invoke("maze:generate", params),
  solveLabyrinth: (maze) => ipcRenderer.invoke("maze:solve", maze),
  updateLabyrinth: (data) => ipcRenderer.invoke("maze:save", data),
  getLabyrinths: (userId) => ipcRenderer.invoke("maze:getUserMazes", userId),
  getLabyrinth: (id) => ipcRenderer.invoke("maze:get", id),

  // Admin
  getAllUsers: (adminId) => ipcRenderer.invoke("admin:getUsers", adminId),
  getAllLabyrinths: (adminId) => ipcRenderer.invoke("admin:getAllMazes", adminId),
  getStats: (adminId) => ipcRenderer.invoke("admin:getStats", adminId),
})

// Ajouter une fonction pour vérifier si l'API est disponible
contextBridge.exposeInMainWorld("checkAPI", () => {
  return true
})
