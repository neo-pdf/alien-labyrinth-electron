const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const JWT_SECRET = "alien-labyrinth-secret-key-2024-cosmic-edition"

class Auth {
  constructor(database) {
    this.db = database
    this.activeSessions = new Map() // Stockage des sessions actives
  }

  async register(userData) {
    try {
      const { username, email, password, planetOrigin } = userData

      // Validation des données
      if (!username || !email || !password) {
        throw new Error("🛸 Tous les champs sont requis pour rejoindre la flotte!")
      }

      if (password.length < 8) {
        throw new Error("🔐 Le code de sécurité doit contenir au moins 8 caractères")
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await this.db.getUserByEmail(email)
      if (existingUser) {
        throw new Error("👽 Cet agent est déjà enregistré dans nos bases de données")
      }

      // Créer l'utilisateur
      const result = await this.db.createUser({ username, email, password, planetOrigin })

      if (result.success) {
        // Générer un token JWT
        const token = this.generateToken(result.user)
        this.activeSessions.set(token, result.user.id)

        return {
          success: true,
          message: "🛸 Bienvenue dans la flotte alien!",
          user: result.user,
          token,
        }
      }

      throw new Error("Erreur lors de la création du compte")
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async login(credentials) {
    try {
      const { email, password } = credentials

      if (!email || !password) {
        throw new Error("📡 Identifiants requis pour accéder au vaisseau")
      }

      // Récupérer l'utilisateur
      const user = await this.db.getUserByEmail(email)
      if (!user) {
        throw new Error("👽 Agent non trouvé dans nos bases de données")
      }

      // Vérifier le mot de passe
      const isValidPassword = bcrypt.compareSync(password, user.password_hash)
      if (!isValidPassword) {
        throw new Error("🔐 Code de sécurité incorrect")
      }

      // Mettre à jour la dernière connexion
      await this.db.updateLastLogin(user.id)

      // Générer un token
      const token = this.generateToken(user)
      this.activeSessions.set(token, user.id)

      return {
        success: true,
        message: "🚀 Connexion au vaisseau réussie!",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          planetOrigin: user.planet_origin,
        },
        token,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async logout(token) {
    try {
      if (this.activeSessions.has(token)) {
        this.activeSessions.delete(token)
        return {
          success: true,
          message: "🚪 Déconnexion du vaisseau réussie",
        }
      }

      return {
        success: false,
        error: "Session non trouvée",
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    )
  }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET)

      // Vérifier si la session est active
      if (!this.activeSessions.has(token)) {
        throw new Error("Session expirée")
      }

      return { success: true, user: decoded }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  isAdmin(token) {
    const verification = this.verifyToken(token)
    return verification.success && verification.user.role === "commander"
  }
}

module.exports = Auth
