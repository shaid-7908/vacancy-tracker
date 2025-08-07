import express from 'express'
import { AuthController } from '../controller/auth.controller'
import { authChecker } from '../middelware/auth.middleware'

const authRouter = express.Router()
const authController = new AuthController()

// API Routes
authRouter.post('/register-admin', authController.registerTestAdmin)
authRouter.post('/login-user', authController.loginUser)
authRouter.post('/refresh-token', authController.refreshToken)
authRouter.post('/logout', authController.logoutUser)
authRouter.get('/logout', authController.logoutUser) // For direct browser access

// EJS Render Routes
authRouter.get('/login', authController.renderLoginPage)
authRouter.get('/dashboard', authChecker, authController.renderDashBoard)

export default authRouter