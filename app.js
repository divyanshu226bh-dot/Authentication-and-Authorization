import express from "express";
import morgan from "morgan";
import cors from "cors";
import authRouter from "./src/routes/user.routes.js";
import cookieParser from "cookie-parser";
const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(cors());
app.use(cookieParser());

app.use("/api/auth", authRouter);

export default app;