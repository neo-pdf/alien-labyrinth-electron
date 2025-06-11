const sqlite3 = require("sqlite3").verbose()
const path = require("path")
const bcrypt = require("bcryptjs")

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, "alien_labyrinth.db"))
    this.init()
  }

  init() {
    this.db.serialize(() => {
      // 👽 Table des utilisateurs aliens
      this.db.run(`
        CREATE TABLE IF NOT EXISTS alien_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'explorer',
          planet_origin TEXT DEFAULT 'Unknown',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME,
          total_mazes INTEGER DEFAULT 0,
          total_solved INTEGER DEFAULT 0
        )
      `)

      // 🛸 Table des labyrinthes
      this.db.run(`
        CREATE TABLE IF NOT EXISTS alien_mazes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          size TEXT NOT NULL,
          difficulty INTEGER NOT NULL,
          theme TEXT DEFAULT 'cosmic',
          maze_data TEXT NOT NULL,
          solution_data TEXT,
          best_time INTEGER,
          times_solved INTEGER DEFAULT 0,
          is_public BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES alien_users (id) ON DELETE CASCADE
        )
      `)

      // 🏆 Table des scores
      this.db.run(`
        CREATE TABLE IF NOT EXISTS alien_scores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          maze_id INTEGER NOT NULL,
          completion_time INTEGER NOT NULL,
          moves_count INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES alien_users (id) ON DELETE CASCADE,
          FOREIGN KEY (maze_id) REFERENCES alien_mazes (id) ON DELETE CASCADE
        )
      `)

      // Créer un admin alien par défaut
      this.createDefaultAdmin()
    })
  }

  createDefaultAdmin() {
    const adminEmail = "commander@alien-fleet.galaxy"
    const adminPassword = "AlienCommander2024!"

    this.db.get("SELECT id FROM alien_users WHERE email = ?", [adminEmail], (err, row) => {
      if (err) {
        console.error("❌ Erreur vérification admin:", err)
        return
      }

      if (!row) {
        const hashedPassword = bcrypt.hashSync(adminPassword, 12)
        this.db.run(
          `
          INSERT INTO alien_users (username, email, password_hash, role, planet_origin)
          VALUES (?, ?, ?, ?, ?)
        `,
          ["AlienCommander", adminEmail, hashedPassword, "commander", "Mothership"],
          (err) => {
            if (err) {
              console.error("❌ Erreur création admin:", err)
            } else {
              console.log("👽 Commandant Alien créé avec succès!")
              console.log("📧 Email:", adminEmail)
              console.log("🔐 Mot de passe:", adminPassword)
            }
          },
        )
      }
    })
  }

  // 👽 Méthodes utilisateurs
  async createUser(userData) {
    return new Promise((resolve, reject) => {
      const { username, email, password, planetOrigin = "Earth" } = userData
      const hashedPassword = bcrypt.hashSync(password, 12)

      this.db.run(
        `
        INSERT INTO alien_users (username, email, password_hash, planet_origin)
        VALUES (?, ?, ?, ?)
      `,
        [username, email, hashedPassword, planetOrigin],
        function (err) {
          if (err) {
            reject(err)
          } else {
            resolve({
              success: true,
              user: {
                id: this.lastID,
                username,
                email,
                role: "explorer",
                planetOrigin,
              },
            })
          }
        },
      )
    })
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT * FROM alien_users WHERE email = ?", [email], (err, row) => {
        if (err) reject(err)
        else resolve(row)
      })
    })
  }

  async updateLastLogin(userId) {
    return new Promise((resolve, reject) => {
      this.db.run("UPDATE alien_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [userId], (err) => {
        if (err) reject(err)
        else resolve(true)
      })
    })
  }

  // 🛸 Méthodes labyrinthes
  async saveMaze(userId, mazeData, name) {
    return new Promise((resolve, reject) => {
      const { size, difficulty, theme, grid, solution } = mazeData

      this.db.run(
        `
        INSERT INTO alien_mazes (user_id, name, size, difficulty, theme, maze_data, solution_data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [userId, name, size, difficulty, theme, JSON.stringify(grid), JSON.stringify(solution)],
        function (err) {
          if (err) {
            reject(err)
          } else {
            // Mettre à jour le compteur de labyrinthes de l'utilisateur
            resolve({ success: true, mazeId: this.lastID })
          }
        },
      )
    })
  }

  async getUserMazes(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
        SELECT id, name, size, difficulty, theme, times_solved, best_time, created_at
        FROM alien_mazes 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `,
        [userId],
        (err, rows) => {
          if (err) reject(err)
          else resolve({ success: true, mazes: rows })
        },
      )
    })
  }

  async getMazeById(mazeId) {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT * FROM alien_mazes WHERE id = ?", [mazeId], (err, row) => {
        if (err) reject(err)
        else {
          if (row) {
            row.maze_data = JSON.parse(row.maze_data)
            row.solution_data = JSON.parse(row.solution_data)
          }
          resolve(row)
        }
      })
    })
  }

  async deleteMaze(userId, mazeId) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM alien_mazes WHERE id = ? AND user_id = ?", [mazeId, userId], function (err) {
        if (err) reject(err)
        else resolve({ success: true, deleted: this.changes > 0 })
      })
    })
  }

  // 📊 Méthodes statistiques
  async getGlobalStats() {
    return new Promise((resolve, reject) => {
      const stats = {}

      // Nombre total d'utilisateurs
      this.db.get("SELECT COUNT(*) as count FROM alien_users", (err, row) => {
        if (err) return reject(err)
        stats.totalUsers = row.count

        // Nombre total de labyrinthes
        this.db.get("SELECT COUNT(*) as count FROM alien_mazes", (err, row) => {
          if (err) return reject(err)
          stats.totalMazes = row.count

          // Labyrinthe le plus difficile
          this.db.get("SELECT MAX(difficulty) as max FROM alien_mazes", (err, row) => {
            if (err) return reject(err)
            stats.maxDifficulty = row.max || 0

            resolve({ success: true, stats })
          })
        })
      })
    })
  }

  async getAllUsers() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
        SELECT id, username, email, role, planet_origin, created_at, last_login, total_mazes
        FROM alien_users 
        ORDER BY created_at DESC
      `,
        (err, rows) => {
          if (err) reject(err)
          else resolve({ success: true, users: rows })
        },
      )
    })
  }

  async getAllMazes() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
        SELECT m.*, u.username 
        FROM alien_mazes m
        JOIN alien_users u ON m.user_id = u.id
        ORDER BY m.created_at DESC
      `,
        (err, rows) => {
          if (err) reject(err)
          else resolve({ success: true, mazes: rows })
        },
      )
    })
  }
}

module.exports = Database
