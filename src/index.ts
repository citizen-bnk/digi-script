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

app.listen(env.PORT, () => {
  logger.info(`DigiScript core system listening on port ${env.PORT}`);
});
