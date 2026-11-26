/*
 * @feature: Express Application
 * @description: Builds the Express app: security headers (helmet), CORS limited to
 *               the configured frontend origins, request logging, JSON parsing,
 *               the /api/v1 router and central error handling.
 */
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import router from "./routes/index.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.allowedOrigins, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"], maxAge: 43200 }));
  if (env.nodeEnv !== "test") app.use(morgan(env.isProduction ? "combined" : "dev"));
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/v1", router);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
