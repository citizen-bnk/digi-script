/**
 * Vercel serverless entrypoint. The same Express app that `npm run dev`
 * serves, exported as a handler so the API runs alongside the two frontends
 * in one deployment — same origin, so there is no CORS to configure and no
 * second URL to keep in sync.
 *
 * vercel.json routes /api/* here, and Vercel strips nothing, so the app is
 * mounted under /api to match.
 */
import express from "express";
import { createApp } from "../src/app.js";

const app = express();
app.use("/api", createApp());

export default app;
