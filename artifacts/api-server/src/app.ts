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
// Whop signs the exact request body. Keep this endpoint raw before the
// JSON parser runs so the SDK can verify the Standard Webhooks signature.
app.use(
  "/api/webhooks/whop",
  express.raw({ type: "application/json", limit: "1mb" }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api", router);

// Global error handler must be last
app.use(errorHandler);

export default app;
