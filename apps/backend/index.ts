import cors from "cors";
import express from "express";
import userRouter from "./routes/userRouter";
import appRouter from "./routes/appRouter";
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Origin"],
  }),
);
app.use("/user", userRouter);
app.use("/app", appRouter);

app.listen(Number(process.env.PORT), () => console.log(`Process listening on ${process.env.PORT}`))
