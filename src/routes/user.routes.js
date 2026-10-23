import express from "express";
const authRouter = express.Router();
import * as controllers from "../controllers/auth.controller.js"

/* 
* POST /api/auth/register
*/
authRouter.post("/register", controllers.registerUser);

/* 
* POST /api/auth/login
*/
authRouter.post("/login", controllers.login)

/*
* GET /api/auth/get-me
*/
authRouter.get("/get-me", controllers.getMe);

/* 
* GET /api/auth/rotate-token
*/
authRouter.get("/rotate-token", controllers.rotateToken);

/*
* GET /api/auth/logout
*/
authRouter.get("/logout", controllers.logout);

/*
* GET /api/auth/logout-all
*/
authRouter.get("/logout-all", controllers.logoutAll);

/*
* GET /api/auth/verifiy-email
*/

authRouter.get("/verify-email", controllers.verifyEmail)

export default authRouter;