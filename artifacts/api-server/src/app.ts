import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { securityHeaders } from "./middlewares/securityHeaders";
import { errorHandler } from "./middlewares/errorHandler";

const app: Express = express();

app.use(securityHeaders);
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api", router);

// Keep API failures machine-readable and consistent. Without this explicit
// fallback, Express returns an HTML 404 page for unknown API paths.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// Global error handler must be last
app.use(errorHandler);

export default app;
