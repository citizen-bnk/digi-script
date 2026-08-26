import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

const app = createApp();

if (env.NODE_ENV === "production" && !env.CORS_ORIGIN) {
  logger.warn(
    "CORS_ORIGIN is not set — this API accepts browser requests from any origin. " +
      "Set it to the frontend's origin (e.g. https://your-app.vercel.app).",
  );
}

if (env.DEMO_MODE) {
  logger.warn(
    "DEMO_MODE is on (the current default) — anyone who can reach this API can sign in as a seeded " +
      "demo account without a password. Set DEMO_MODE=false before this database holds real learner data.",
  );
}

app.listen(env.PORT, () => {
  logger.info(`DigiScript core system listening on port ${env.PORT}`);
});
