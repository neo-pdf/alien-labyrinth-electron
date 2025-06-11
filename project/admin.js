class Admin {
  constructor(database, auth) {
    this.db = database
    this.auth = auth
  }

  async getAllUsers(adminToken) {
    try {
      // Vérifier que l'utilisateur est admin
      if (!this.auth.isAdmin(adminToken)) {
        throw new Error("👑 Accès refusé: Privilèges de commandant requis")
      }

      return await this.db.getAllUsers()
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async getAllMazes(adminToken) {
    try {
      if (!this.auth.isAdmin(adminToken)) {
        throw new Error("👑 Accès refusé: Privilèges de commandant requis")
      }

      return await this.db.getAllMazes()
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async getStats(adminToken) {
    try {
      if (!this.auth.isAdmin(adminToken)) {
        throw new Error("👑 Accès refusé: Privilèges de commandant requis")
      }

      return await this.db.getGlobalStats()
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async deleteUser(adminToken, userId) {
    try {
      if (!this.auth.isAdmin(adminToken)) {
        throw new Error("👑 Accès refusé: Privilèges de commandant requis")
      }

      // Ne pas permettre la suppression de l'admin principal
      const adminUser = this.auth.verifyToken(adminToken)
      if (adminUser.user.id === userId) {
        throw new Error("🛸 Impossible de supprimer votre propre compte de commandant")
      }

      return await this.db.deleteUser(userId)
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async promoteUser(adminToken, userId, newRole) {
    try {
      if (!this.auth.isAdmin(adminToken)) {
        throw new Error("👑 Accès refusé: Privilèges de commandant requis")
      }

      const validRoles = ["explorer", "navigator", "commander"]
      if (!validRoles.includes(newRole)) {
        throw new Error("🛸 Rôle invalide dans la hiérarchie alien")
      }

      return await this.db.updateUserRole(userId, newRole)
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async getMazeAnalytics(adminToken) {
    try {
      if (!this.auth.isAdmin(adminToken)) {
        throw new Error("👑 Accès refusé: Privilèges de commandant requis")
      }

      // Statistiques avancées sur les labyrinthes
      const analytics = {
        difficultyDistribution: await this.db.getDifficultyDistribution(),
        sizePopularity: await this.db.getSizePopularity(),
        themePreferences: await this.db.getThemePreferences(),
        averageCompletionTime: await this.db.getAverageCompletionTime(),
      }

      return {
        success: true,
        analytics,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }
}

module.exports = Admin
