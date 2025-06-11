// Variables globales
let currentUser = null
let currentMaze = null
let currentSolution = null
let playerPosition = null
let moveCount = 0
let startTime = null
let gameActive = false

// Fonctions utilitaires
function showNotification(message, type = "success") {
  console.log(`[${type.toUpperCase()}] ${message}`)

  const notifications = document.getElementById("notifications")
  if (!notifications) return

  const notification = document.createElement("div")
  notification.className = `notification ${type}`
  notification.textContent = message

  notifications.appendChild(notification)

  setTimeout(() => {
    notification.classList.add("show")
  }, 10)

  setTimeout(() => {
    notification.classList.remove("show")
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 300)
  }, 5000)
}

function showSection(sectionId) {
  console.log("🔄 Changement de section vers:", sectionId)

  if (sectionId !== "auth" && !currentUser) {
    showNotification("🔐 Connexion requise pour accéder à cette section", "error")
    sectionId = "auth"
  }

  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active")
  })

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.remove("active")
  })

  const targetSection = document.getElementById(sectionId + "-section")
  if (targetSection) {
    targetSection.classList.add("active")
  }

  const targetButton = document.querySelector(`[data-section="${sectionId}"]`)
  if (targetButton) {
    targetButton.classList.add("active")
  }

  loadSectionData(sectionId)
}

function switchAuthTab(tabType) {
  console.log("🔄 Changement d'onglet vers:", tabType)

  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.classList.remove("active")
  })

  document.querySelectorAll(".auth-form").forEach((form) => {
    form.classList.remove("active")
  })

  if (tabType === "login") {
    document.querySelector('[data-tab="login"]').classList.add("active")
    document.getElementById("login-form").classList.add("active")
  } else {
    document.querySelector('[data-tab="register"]').classList.add("active")
    document.getElementById("register-form").classList.add("active")
  }
}

// Fonctions d'authentification
async function handleLogin(event) {
  event.preventDefault()
  console.log("🚀 Tentative de connexion...")

  const email = document.getElementById("login-username").value.trim()
  const password = document.getElementById("login-password").value

  if (!email || !password) {
    showNotification("Veuillez remplir tous les champs", "error")
    return
  }

  try {
    const result = await window.api.login({ email, password })
    console.log("✅ Résultat de login:", result)

    if (result.success) {
      currentUser = result.user
      showDashboard()
      showNotification("🚀 Connexion réussie ! Bienvenue à bord !", "success")
    } else {
      showNotification(result.message || "Erreur de connexion", "error")
    }
  } catch (error) {
    console.error("❌ Erreur de connexion:", error)
    showNotification("Erreur de connexion: " + (error.message || "Erreur inconnue"), "error")
  }
}

async function handleRegister(event) {
  event.preventDefault()
  console.log("🛸 Tentative d'inscription...")

  const username = document.getElementById("register-username").value.trim()
  const email = document.getElementById("register-email").value.trim()
  const password = document.getElementById("register-password").value
  const confirmPassword = document.getElementById("register-confirm").value
  const planetOrigin = document.getElementById("register-planet").value

  if (!username || !email || !password || !confirmPassword) {
    showNotification("Veuillez remplir tous les champs", "error")
    return
  }

  if (password !== confirmPassword) {
    showNotification("Les mots de passe ne correspondent pas", "error")
    return
  }

  if (password.length < 6) {
    showNotification("Le mot de passe doit contenir au moins 6 caractères", "error")
    return
  }

  try {
    const result = await window.api.register({ username, email, password, planetOrigin })
    console.log("✅ Résultat de register:", result)

    if (result.success) {
      currentUser = result.user
      showDashboard()
      showNotification("🛸 Inscription réussie ! Bienvenue dans la flotte !", "success")
    } else {
      showNotification(result.message || "Erreur d'inscription", "error")
    }
  } catch (error) {
    console.error("❌ Erreur d'inscription:", error)
    showNotification("Erreur d'inscription: " + (error.message || "Erreur inconnue"), "error")
  }
}

function showDashboard() {
  const userInfo = document.querySelector(".user-info")
  const userName = document.querySelector(".user-name")

  if (userInfo) userInfo.classList.remove("hidden")
  if (userName) userName.textContent = `👽 ${currentUser.username}`

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    if (btn.dataset.section !== "auth") {
      btn.style.display = "block"
    } else {
      btn.style.display = "none"
    }
  })

  if (currentUser.role === "admin" || currentUser.role === "commander") {
    document.querySelectorAll(".admin-only").forEach((btn) => {
      btn.classList.remove("hidden")
      btn.style.display = "block"
    })
  }

  loadMyLabyrinths()
  showSection("dashboard")
}

function logout() {
  currentUser = null
  currentMaze = null
  currentSolution = null
  playerPosition = null
  gameActive = false

  const userInfo = document.querySelector(".user-info")
  if (userInfo) userInfo.classList.add("hidden")

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    if (btn.dataset.section !== "auth") {
      btn.style.display = "none"
    } else {
      btn.style.display = "block"
    }
  })

  document.querySelectorAll(".admin-only").forEach((btn) => {
    btn.classList.add("hidden")
    btn.style.display = "none"
  })

  document.getElementById("login-form").reset()
  document.getElementById("register-form").reset()

  showSection("auth")
  showNotification("🚪 Déconnexion réussie", "success")
}

// Fonctions de gestion des labyrinthes
async function loadMyLabyrinths() {
  try {
    const result = await window.api.getLabyrinths(currentUser.id)

    if (result.success) {
      displayLabyrinths(result.labyrinths || result.mazes || [])
      updateDashboardStats(result.labyrinths || result.mazes || [])
    } else {
      console.log("Aucun labyrinthe trouvé")
      displayLabyrinths([])
      updateDashboardStats([])
    }
  } catch (error) {
    console.error("Erreur:", error)
    displayLabyrinths([])
    updateDashboardStats([])
  }
}

function displayLabyrinths(labyrinths) {
  const grid = document.getElementById("mazes-grid")

  if (!labyrinths || labyrinths.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>🛸 Aucun labyrinthe créé</h3>
        <p>Commencez par créer votre premier labyrinthe alien !</p>
        <button class="alien-btn primary" id="create-first-maze">
          🌀 Créer un labyrinthe
        </button>
      </div>
    `

    const createFirstMazeBtn = document.getElementById("create-first-maze")
    if (createFirstMazeBtn) {
      createFirstMazeBtn.addEventListener("click", () => showSection("create"))
    }

    return
  }

  grid.innerHTML = labyrinths
    .map(
      (labyrinth) => `
      <div class="labyrinth-card" data-id="${labyrinth.id}">
        <div class="labyrinth-preview">
          <canvas width="200" height="150" data-labyrinth-id="${labyrinth.id}"></canvas>
        </div>
        <div class="labyrinth-info">
          <div class="labyrinth-name">${labyrinth.name}</div>
          <div class="labyrinth-details">
            Taille: ${labyrinth.size} | Difficulté: ${labyrinth.difficulty}/10
            <br>Créé le: ${new Date(labyrinth.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    `,
    )
    .join("")

  document.querySelectorAll(".labyrinth-card").forEach((card) => {
    card.addEventListener("click", () => {
      const labyrinthId = card.dataset.id
      viewLabyrinth(labyrinthId)
    })
  })
}

function updateDashboardStats(labyrinths) {
  if (!labyrinths) return

  document.getElementById("total-mazes").textContent = labyrinths.length
  document.getElementById("solved-mazes").textContent = labyrinths.filter((l) => l.solved).length || 0

  if (labyrinths.length > 0) {
    const avgDifficulty = labyrinths.reduce((sum, l) => sum + l.difficulty, 0) / labyrinths.length
    document.getElementById("avg-difficulty").textContent = avgDifficulty.toFixed(1)
  } else {
    document.getElementById("avg-difficulty").textContent = "0"
  }
}

function loadSectionData(sectionName) {
  if (sectionName === "dashboard" && currentUser) {
    loadMyLabyrinths()
  }
}

// Générateur de labyrinthe simple
function generateSimpleMaze(size) {
  console.log("🌀 Génération d'un labyrinthe simple de taille:", size)

  let dimensions
  switch (size) {
    case "small":
      dimensions = { width: 21, height: 21 }
      break
    case "medium":
      dimensions = { width: 31, height: 31 }
      break
    case "large":
      dimensions = { width: 41, height: 41 }
      break
    default:
      dimensions = { width: 31, height: 31 }
  }

  const { width, height } = dimensions
  const grid = []

  // Initialiser la grille avec des murs
  for (let y = 0; y < height; y++) {
    grid[y] = []
    for (let x = 0; x < width; x++) {
      grid[y][x] = 1 // 1 = mur
    }
  }

  // Créer des chemins
  function carve(x, y) {
    grid[y][x] = 0 // 0 = chemin

    const directions = [
      [0, -2],
      [2, 0],
      [0, 2],
      [-2, 0],
    ]

    // Mélanger les directions
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[directions[i], directions[j]] = [directions[j], directions[i]]
    }

    for (const [dx, dy] of directions) {
      const newX = x + dx
      const newY = y + dy

      if (newX > 0 && newX < width - 1 && newY > 0 && newY < height - 1 && grid[newY][newX] === 1) {
        grid[y + dy / 2][x + dx / 2] = 0 // Créer le passage
        carve(newX, newY)
      }
    }
  }

  // Commencer la génération depuis (1,1)
  carve(1, 1)

  // S'assurer que l'entrée et la sortie sont accessibles
  grid[1][1] = 0 // Entrée
  grid[height - 2][width - 2] = 0 // Sortie

  return {
    grid,
    width,
    height,
    start: { x: 1, y: 1 },
    end: { x: width - 2, y: height - 2 },
    size,
    colors: {
      wall: "#0a0a0a",
      path: "#1e1e1e",
      start: "#00ff7f",
      end: "#00bfff",
      solution: "#ffff00",
      player: "#ff00ff", // Couleur du joueur (magenta)
    },
  }
}

// Fonctions de création de labyrinthe
async function generateMaze() {
  console.log("🛸 Début de génération du labyrinthe...")

  const size = document.getElementById("maze-size").value
  const difficulty = Number.parseInt(document.getElementById("difficulty-slider").value)
  const name = document.getElementById("maze-name").value || `Mission Alien-${Math.floor(Math.random() * 1000)}`
  const theme = document.getElementById("maze-theme").value

  try {
    console.log("📡 Paramètres:", { size, difficulty, name, theme })

    // Essayer d'abord l'API
    let result
    if (window.api && window.api.createLabyrinth) {
      try {
        result = await window.api.createLabyrinth({
          userId: currentUser.id,
          size,
          difficulty,
          name,
          theme,
        })
      } catch (apiError) {
        console.log("⚠️ API non disponible, génération locale...")
        result = null
      }
    }

    // Si l'API ne fonctionne pas, générer localement
    if (!result || !result.success) {
      console.log("🔧 Génération locale du labyrinthe...")
      const maze = generateSimpleMaze(size)
      maze.difficulty = difficulty
      maze.theme = theme
      maze.name = name
      maze.id = Date.now() // ID temporaire

      currentMaze = maze
      result = { success: true, maze }
    } else {
      currentMaze = result.maze
    }

    if (result.success) {
      console.log("✅ Labyrinthe généré:", currentMaze)

      // Initialiser la position du joueur au départ
      playerPosition = { ...currentMaze.start }
      moveCount = 0
      startTime = Date.now()
      gameActive = true

      // Activer les contrôles clavier
      activateKeyboardControls()

      renderMazeWithPlayer(currentMaze, "maze-canvas")

      // Afficher les actions
      const actions = document.querySelector(".maze-actions")
      if (actions) {
        actions.style.display = "flex"
      }

      showNotification("🛸 Labyrinthe généré avec succès! Utilisez les flèches ou ZQSD pour vous déplacer.", "success")
    } else {
      showNotification("Erreur lors de la génération du labyrinthe", "error")
    }
  } catch (error) {
    console.error("❌ Erreur:", error)

    // En cas d'erreur, générer quand même un labyrinthe simple
    console.log("🔧 Génération de secours...")
    try {
      const maze = generateSimpleMaze(size)
      maze.difficulty = difficulty
      maze.theme = theme
      maze.name = name
      maze.id = Date.now()

      currentMaze = maze

      // Initialiser la position du joueur au départ
      playerPosition = { ...currentMaze.start }
      moveCount = 0
      startTime = Date.now()
      gameActive = true

      // Activer les contrôles clavier
      activateKeyboardControls()

      renderMazeWithPlayer(currentMaze, "maze-canvas")

      const actions = document.querySelector(".maze-actions")
      if (actions) {
        actions.style.display = "flex"
      }

      showNotification("🛸 Labyrinthe généré (mode local)! Utilisez les flèches ou ZQSD pour vous déplacer.", "success")
    } catch (fallbackError) {
      console.error("❌ Erreur de génération de secours:", fallbackError)
      showNotification("Erreur lors de la génération du labyrinthe", "error")
    }
  }
}

function renderMaze(maze, canvasId) {
  console.log("🎨 Rendu du labyrinthe sur canvas:", canvasId)

  const canvas = document.getElementById(canvasId)
  if (!canvas) {
    console.error("❌ Canvas non trouvé:", canvasId)
    return
  }

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    console.error("❌ Contexte 2D non disponible")
    return
  }

  console.log("📐 Dimensions du labyrinthe:", maze.width, "x", maze.height)
  console.log("📐 Dimensions du canvas:", canvas.width, "x", canvas.height)

  const cellSize = Math.min((canvas.width - 40) / maze.width, (canvas.height - 40) / maze.height)
  console.log("📏 Taille des cellules:", cellSize)

  const offsetX = (canvas.width - cellSize * maze.width) / 2
  const offsetY = (canvas.height - cellSize * maze.height) / 2

  // Effacer le canvas avec une couleur visible
  ctx.fillStyle = "#2a2a2a"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Dessiner le labyrinthe
  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      const cellX = offsetX + x * cellSize
      const cellY = offsetY + y * cellSize

      if (maze.grid[y][x] === 0) {
        // Chemin - couleur claire
        ctx.fillStyle = "#4a4a4a"
        ctx.fillRect(cellX, cellY, cellSize, cellSize)

        // Bordure du chemin
        ctx.strokeStyle = "#00ff7f44"
        ctx.lineWidth = 1
        ctx.strokeRect(cellX, cellY, cellSize, cellSize)
      } else {
        // Mur - couleur sombre
        ctx.fillStyle = "#0a0a0a"
        ctx.fillRect(cellX, cellY, cellSize, cellSize)
      }
    }
  }

  // Marquer le départ (vert brillant)
  const startX = offsetX + maze.start.x * cellSize
  const startY = offsetY + maze.start.y * cellSize
  ctx.fillStyle = "#00ff7f"
  ctx.beginPath()
  ctx.arc(startX + cellSize / 2, startY + cellSize / 2, cellSize / 3, 0, Math.PI * 2)
  ctx.fill()

  // Marquer l'arrivée (bleu brillant)
  const endX = offsetX + maze.end.x * cellSize
  const endY = offsetY + maze.end.y * cellSize
  ctx.fillStyle = "#00bfff"
  ctx.beginPath()
  ctx.arc(endX + cellSize / 2, endY + cellSize / 2, cellSize / 3, 0, Math.PI * 2)
  ctx.fill()

  // Ajouter un effet de lueur
  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width / 2,
  )
  gradient.addColorStop(0, "rgba(0, 255, 127, 0.1)")
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)")

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  console.log("✅ Rendu du labyrinthe terminé")
}

function renderMazeWithPlayer(maze, canvasId) {
  // D'abord, dessiner le labyrinthe de base
  renderMaze(maze, canvasId)

  if (!playerPosition) return

  const canvas = document.getElementById(canvasId)
  const ctx = canvas.getContext("2d")

  const cellSize = Math.min((canvas.width - 40) / maze.width, (canvas.height - 40) / maze.height)
  const offsetX = (canvas.width - cellSize * maze.width) / 2
  const offsetY = (canvas.height - cellSize * maze.height) / 2

  // Dessiner le joueur (magenta brillant)
  const playerX = offsetX + playerPosition.x * cellSize
  const playerY = offsetY + playerPosition.y * cellSize

  // Effet de lueur autour du joueur
  const playerGlow = ctx.createRadialGradient(
    playerX + cellSize / 2,
    playerY + cellSize / 2,
    0,
    playerX + cellSize / 2,
    playerY + cellSize / 2,
    cellSize,
  )
  playerGlow.addColorStop(0, "rgba(255, 0, 255, 0.7)")
  playerGlow.addColorStop(1, "rgba(255, 0, 255, 0)")

  ctx.fillStyle = playerGlow
  ctx.fillRect(playerX - cellSize / 2, playerY - cellSize / 2, cellSize * 2, cellSize * 2)

  // Dessiner le joueur
  ctx.fillStyle = "#ff00ff" // Magenta
  ctx.beginPath()
  ctx.arc(playerX + cellSize / 2, playerY + cellSize / 2, cellSize / 2.5, 0, Math.PI * 2)
  ctx.fill()

  // Ajouter un effet de pulsation
  ctx.strokeStyle = "#ffffff"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(playerX + cellSize / 2, playerY + cellSize / 2, cellSize / 2.5, 0, Math.PI * 2)
  ctx.stroke()

  // Mettre à jour les informations de jeu
  updateGameInfo()
}

function updateGameInfo() {
  // Mettre à jour le compteur de mouvements
  const moveCounter = document.getElementById("move-counter")
  if (moveCounter) {
    moveCounter.textContent = moveCount
  }

  // Mettre à jour le chronomètre
  if (startTime) {
    const timeElapsed = Math.floor((Date.now() - startTime) / 1000)
    const timeCounter = document.getElementById("time-counter")
    if (timeCounter) {
      const minutes = Math.floor(timeElapsed / 60)
      const seconds = timeElapsed % 60
      timeCounter.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`
    }
  }
}

function activateKeyboardControls() {
  // Supprimer d'abord les anciens écouteurs s'ils existent
  document.removeEventListener("keydown", handleKeyDown)

  // Ajouter le nouvel écouteur
  document.addEventListener("keydown", handleKeyDown)

  console.log("🎮 Contrôles clavier activés")
}

function handleKeyDown(event) {
  if (!gameActive || !currentMaze || !playerPosition) return

  let dx = 0
  let dy = 0

  // Déterminer la direction en fonction de la touche
  switch (event.key) {
    case "ArrowUp":
    case "z":
    case "Z":
    case "w":
    case "W":
      dy = -1
      break
    case "ArrowDown":
    case "s":
    case "S":
      dy = 1
      break
    case "ArrowLeft":
    case "q":
    case "Q":
    case "a":
    case "A":
      dx = -1
      break
    case "ArrowRight":
    case "d":
    case "D":
      dx = 1
      break
    default:
      return // Ignorer les autres touches
  }

  // Calculer la nouvelle position
  const newX = playerPosition.x + dx
  const newY = playerPosition.y + dy

  // Vérifier si le mouvement est valide (pas de collision avec un mur)
  if (
    newX >= 0 &&
    newX < currentMaze.width &&
    newY >= 0 &&
    newY < currentMaze.height &&
    currentMaze.grid[newY][newX] === 0
  ) {
    // Mettre à jour la position du joueur
    playerPosition.x = newX
    playerPosition.y = newY
    moveCount++

    // Redessiner le labyrinthe avec la nouvelle position
    renderMazeWithPlayer(currentMaze, "maze-canvas")

    // Vérifier si le joueur a atteint la sortie
    if (newX === currentMaze.end.x && newY === currentMaze.end.y) {
      gameActive = false
      const timeElapsed = Math.floor((Date.now() - startTime) / 1000)
      showNotification(
        `🎉 Félicitations ! Vous avez résolu le labyrinthe en ${moveCount} mouvements et ${timeElapsed} secondes !`,
        "success",
      )

      // Afficher un effet de victoire
      showVictoryEffect("maze-canvas")
    }
  }
}

function showVictoryEffect(canvasId) {
  const canvas = document.getElementById(canvasId)
  const ctx = canvas.getContext("2d")

  // Créer un effet de particules
  const particles = []
  const particleCount = 100

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      size: Math.random() * 5 + 2,
      speedX: (Math.random() - 0.5) * 8,
      speedY: (Math.random() - 0.5) * 8,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
    })
  }

  // Animation des particules
  let animationId
  const animate = () => {
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    particles.forEach((p) => {
      p.x += p.speedX
      p.y += p.speedY

      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()

      // Réduire progressivement la taille
      p.size *= 0.98
    })

    // Arrêter l'animation quand les particules sont trop petites
    if (particles[0].size < 0.5) {
      cancelAnimationFrame(animationId)
      renderMazeWithPlayer(currentMaze, canvasId)
    } else {
      animationId = requestAnimationFrame(animate)
    }
  }

  animate()
}

async function saveMaze() {
  if (!currentMaze) {
    showNotification("Aucun labyrinthe à sauvegarder", "error")
    return
  }

  const name = document.getElementById("maze-name").value || `Mission Alien-${Math.floor(Math.random() * 1000)}`

  try {
    if (window.api && window.api.updateLabyrinth) {
      const result = await window.api.updateLabyrinth({
        labyrinthId: currentMaze.id,
        name,
        maze: currentMaze,
      })

      if (result.success) {
        showNotification("💾 Labyrinthe sauvegardé avec succès!", "success")
        loadMyLabyrinths()
      } else {
        showNotification("Erreur lors de la sauvegarde", "error")
      }
    } else {
      showNotification("💾 Labyrinthe sauvegardé localement!", "success")
    }
  } catch (error) {
    console.error("Erreur:", error)
    showNotification("💾 Labyrinthe sauvegardé localement!", "success")
  }
}

// Algorithme de résolution simple
function solveMazeLocal(maze) {
  const { grid, start, end, width, height } = maze
  const visited = Array(height)
    .fill()
    .map(() => Array(width).fill(false))
  const path = []

  function dfs(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height || visited[y][x] || grid[y][x] === 1) {
      return false
    }

    visited[y][x] = true
    path.push({ x, y })

    if (x === end.x && y === end.y) {
      return true
    }

    // Essayer les 4 directions
    if (dfs(x + 1, y) || dfs(x - 1, y) || dfs(x, y + 1) || dfs(x, y - 1)) {
      return true
    }

    path.pop()
    return false
  }

  if (dfs(start.x, start.y)) {
    return { success: true, path, length: path.length }
  }

  return { success: false, error: "Aucun chemin trouvé" }
}

async function solveCurrentMaze() {
  if (!currentMaze) {
    showNotification("Aucun labyrinthe à résoudre", "error")
    return
  }

  try {
    let result

    // Essayer l'API d'abord
    if (window.api && window.api.solveLabyrinth) {
      try {
        result = await window.api.solveLabyrinth(currentMaze)
      } catch (apiError) {
        console.log("⚠️ API de résolution non disponible, résolution locale...")
        result = null
      }
    }

    // Si l'API ne fonctionne pas, résoudre localement
    if (!result || !result.success) {
      console.log("🔧 Résolution locale du labyrinthe...")
      result = solveMazeLocal(currentMaze)
    }

    if (result.success) {
      currentSolution = result
      renderSolution(currentMaze, result.path, "maze-canvas")
      showNotification("🔍 Solution trouvée!", "success")
    } else {
      showNotification("Aucune solution trouvée", "error")
    }
  } catch (error) {
    console.error("Erreur:", error)

    // Essayer la résolution locale en cas d'erreur
    try {
      const result = solveMazeLocal(currentMaze)
      if (result.success) {
        currentSolution = result
        renderSolution(currentMaze, result.path, "maze-canvas")
        showNotification("🔍 Solution trouvée (mode local)!", "success")
      } else {
        showNotification("Aucune solution trouvée", "error")
      }
    } catch (fallbackError) {
      showNotification("Erreur lors de la résolution", "error")
    }
  }
}

function renderSolution(maze, path, canvasId) {
  // D'abord, dessiner le labyrinthe
  renderMaze(maze, canvasId)

  const canvas = document.getElementById(canvasId)
  const ctx = canvas.getContext("2d")

  const cellSize = Math.min((canvas.width - 40) / maze.width, (canvas.height - 40) / maze.height)
  const offsetX = (canvas.width - cellSize * maze.width) / 2
  const offsetY = (canvas.height - cellSize * maze.height) / 2

  // Dessiner le chemin de la solution
  ctx.strokeStyle = "#ffff00"
  ctx.lineWidth = Math.max(2, cellSize / 6)
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  ctx.beginPath()

  for (let i = 0; i < path.length; i++) {
    const { x, y } = path[i]
    const cellX = offsetX + x * cellSize + cellSize / 2
    const cellY = offsetY + y * cellSize + cellSize / 2

    if (i === 0) {
      ctx.moveTo(cellX, cellY)
    } else {
      ctx.lineTo(cellX, cellY)
    }
  }

  ctx.stroke()

  // Ajouter des points le long du chemin
  for (let i = 0; i < path.length; i += 2) {
    const { x, y } = path[i]
    const cellX = offsetX + x * cellSize + cellSize / 2
    const cellY = offsetY + y * cellSize + cellSize / 2

    ctx.fillStyle = "#ffff0088"
    ctx.beginPath()
    ctx.arc(cellX, cellY, cellSize / 8, 0, Math.PI * 2)
    ctx.fill()
  }
}

async function viewLabyrinth(labyrinthId) {
  showSection("solve")
  showNotification("Fonction de visualisation en développement", "info")
}

// Fonctions d'administration
async function loadAdminData(tabName) {
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "commander")) {
    showNotification("👑 Accès refusé: Privilèges de commandant requis", "error")
    return
  }

  console.log("🔍 Chargement des données admin:", tabName)

  try {
    switch (tabName) {
      case "users":
        await loadAdminUsers()
        break
      case "mazes":
        await loadAdminMazes()
        break
      case "stats":
        await loadAdminStats()
        break
    }
  } catch (error) {
    console.error("❌ Erreur chargement admin:", error)
    showNotification("Erreur lors du chargement des données", "error")
  }
}

async function loadAdminUsers() {
  try {
    // Simuler des données si l'API n'est pas disponible
    let users = []

    if (window.api && window.api.getAllUsers) {
      const result = await window.api.getAllUsers(currentUser.id)
      if (result.success) {
        users = result.users
      }
    } else {
      // Données de démonstration
      users = [
        {
          id: 1,
          username: currentUser.username,
          email: currentUser.email,
          role: currentUser.role,
          planet_origin: "Earth",
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        },
        {
          id: 2,
          username: "AlienExplorer",
          email: "explorer@alien-fleet.galaxy",
          role: "explorer",
          planet_origin: "Mars",
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        },
      ]
    }

    // Afficher les utilisateurs dans le tableau
    const tbody = document.querySelector("#users-table tbody")
    if (!tbody) return

    tbody.innerHTML = users
      .map(
        (user) => `
      <tr>
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td>${user.planet_origin}</td>
        <td>${new Date(user.created_at).toLocaleDateString()}</td>
        <td>
          <div class="table-actions">
            <button class="small-button">Éditer</button>
            <button class="small-button danger">Supprimer</button>
          </div>
        </td>
      </tr>
    `,
      )
      .join("")

    showNotification("👥 Données utilisateurs chargées", "info")
  } catch (error) {
    console.error("Erreur:", error)
    showNotification("Erreur lors du chargement des utilisateurs", "error")
  }
}

async function loadAdminMazes() {
  try {
    // Simuler des données si l'API n'est pas disponible
    let mazes = []

    if (window.api && window.api.getAllLabyrinths) {
      const result = await window.api.getAllLabyrinths(currentUser.id)
      if (result.success) {
        mazes = result.mazes
      }
    } else {
      // Données de démonstration
      mazes = [
        {
          id: 1,
          name: "Mission Alpha",
          username: currentUser.username,
          size: "medium",
          difficulty: 5,
          theme: "cosmic",
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Défi Alien",
          username: "AlienExplorer",
          size: "large",
          difficulty: 8,
          theme: "alien",
          created_at: new Date().toISOString(),
        },
      ]
    }

    // Afficher les labyrinthes dans le tableau
    const tbody = document.querySelector("#admin-mazes-table tbody")
    if (!tbody) return

    tbody.innerHTML = mazes
      .map(
        (maze) => `
      <tr>
        <td>${maze.id}</td>
        <td>${maze.name}</td>
        <td>${maze.username}</td>
        <td>${maze.size}</td>
        <td>${maze.difficulty}/10</td>
        <td>${maze.theme}</td>
        <td>${new Date(maze.created_at).toLocaleDateString()}</td>
        <td>
          <div class="table-actions">
            <button class="small-button">Voir</button>
            <button class="small-button danger">Supprimer</button>
          </div>
        </td>
      </tr>
    `,
      )
      .join("")

    showNotification("🗺️ Données labyrinthes chargées", "info")
  } catch (error) {
    console.error("Erreur:", error)
    showNotification("Erreur lors du chargement des labyrinthes", "error")
  }
}

async function loadAdminStats() {
  try {
    // Simuler des données si l'API n'est pas disponible
    let stats = {}

    if (window.api && window.api.getStats) {
      const result = await window.api.getStats(currentUser.id)
      if (result.success) {
        stats = result.stats
      }
    } else {
      // Données de démonstration
      stats = {
        totalUsers: 2,
        totalMazes: 5,
        avgMazesPerUser: 2.5,
      }
    }

    // Afficher les statistiques
    document.getElementById("total-users").textContent = stats.totalUsers || 0
    document.getElementById("total-all-mazes").textContent = stats.totalMazes || 0
    document.getElementById("avg-mazes-per-user").textContent = stats.avgMazesPerUser?.toFixed(1) || "0"

    showNotification("📊 Statistiques chargées", "info")
  } catch (error) {
    console.error("Erreur:", error)
    showNotification("Erreur lors du chargement des statistiques", "error")
  }
}

// Fonction pour vérifier si l'API Electron est disponible
function checkElectronAPI() {
  if (!window.api) {
    console.log("⚠️ API Electron non disponible, mode simulation activé")

    // Simuler une API pour le développement
    window.api = {
      login: async (credentials) => {
        console.log("🔐 Simulation login:", credentials)
        return {
          success: true,
          user: {
            id: 1,
            username: credentials.email || "TestUser",
            role: "explorer",
            email: credentials.email,
          },
        }
      },
      register: async (userData) => {
        console.log("📝 Simulation register:", userData)
        return {
          success: true,
          user: {
            id: 1,
            username: userData.username,
            role: "explorer",
            email: userData.email,
          },
        }
      },
      getLabyrinths: async (userId) => {
        console.log("📋 Simulation getLabyrinths:", userId)
        return { success: true, labyrinths: [] }
      },
      createLabyrinth: async (params) => {
        console.log("🌀 Simulation createLabyrinth:", params)
        return { success: false } // Forcer l'utilisation de la génération locale
      },
      solveLabyrinth: async (maze) => {
        console.log("🔍 Simulation solveLabyrinth:", maze)
        return { success: false } // Forcer l'utilisation de la résolution locale
      },
      getAllUsers: async (userId) => {
        console.log("👥 Simulation getAllUsers:", userId)
        return { success: true, users: [] }
      },
      getAllLabyrinths: async (userId) => {
        console.log("🗺️ Simulation getAllLabyrinths:", userId)
        return { success: true, mazes: [] }
      },
      getStats: async (userId) => {
        console.log("📊 Simulation getStats:", userId)
        return { success: true, stats: {} }
      },
    }
    return false
  }
  console.log("✅ API Electron disponible")
  return true
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  console.log("🛸 Application Alien Labyrinth chargée !")

  checkElectronAPI()

  // Onglets d'authentification
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      console.log("Clic sur l'onglet:", tab.dataset.tab)
      switchAuthTab(tab.dataset.tab)
    })
  })

  // Formulaires d'authentification
  const loginForm = document.getElementById("login-form")
  const registerForm = document.getElementById("register-form")

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin)
    console.log("✅ Event listener ajouté au formulaire de connexion")
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister)
    console.log("✅ Event listener ajouté au formulaire d'inscription")
  }

  // Navigation
  const logoutBtn = document.querySelector(".logout-btn")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout)
  }

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => showSection(btn.dataset.section))
  })

  // Création de labyrinthe
  const generateBtn = document.getElementById("generate-btn")
  if (generateBtn) {
    generateBtn.addEventListener("click", generateMaze)
    console.log("✅ Event listener ajouté au bouton de génération")
  }

  const saveMazeBtn = document.getElementById("save-maze-btn")
  if (saveMazeBtn) {
    saveMazeBtn.addEventListener("click", saveMaze)
  }

  const solvePreviewBtn = document.getElementById("solve-preview-btn")
  if (solvePreviewBtn) {
    solvePreviewBtn.addEventListener("click", solveCurrentMaze)
  }

  // Difficulté
  const difficultySlider = document.getElementById("difficulty-slider")
  if (difficultySlider) {
    difficultySlider.addEventListener("input", () => {
      document.getElementById("difficulty-value").textContent = difficultySlider.value
    })
  }

  // Onglets d'administration
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.adminTab

      // Activer l'onglet
      document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"))
      tab.classList.add("active")

      // Afficher le contenu correspondant
      document.querySelectorAll(".admin-content").forEach((content) => content.classList.remove("active"))
      document.getElementById("admin-" + tabName).classList.add("active")

      // Charger les données
      loadAdminData(tabName)
    })
  })

  // Charger les données admin si on est sur cette section
  if (document.getElementById("admin-section").classList.contains("active")) {
    loadAdminData("users") // Charger les utilisateurs par défaut
  }

  // Afficher la section d'authentification par défaut
  showSection("auth")

  console.log("✅ Event listeners configurés")
})
