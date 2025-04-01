import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import path from 'path';
import * as schema from "../shared/schema";

// Initialize database connection for migrations
const migrationClient = postgres(process.env.DATABASE_URL as string, { max: 1 });

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Set up proper MIME types for PWA files
app.get('/sw.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  res.sendFile(path.resolve('./public/sw.js'));
});

app.get('/manifest.webmanifest', (req, res) => {
  res.set('Content-Type', 'application/manifest+json');
  res.sendFile(path.resolve('./public/manifest.webmanifest'));
});

(async () => {
  try {
    // Initialize database schema
    log("Initializing database schema...");
    const db = drizzle(migrationClient, { schema });
    
    // Create tables if they don't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS reading_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        juz_number INTEGER NOT NULL,
        pages_read INTEGER NOT NULL,
        start_page INTEGER,
        end_page INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS reading_goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        total_pages INTEGER NOT NULL DEFAULT 604,
        daily_target INTEGER NOT NULL DEFAULT 5,
        weekly_target INTEGER NOT NULL DEFAULT 35,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);
    
    // Initialize default data
    await storage.initializeDefaultData();
    log("Database initialization complete");
  } catch (error) {
    log(`Database initialization error: ${error}`);
  } finally {
    // Close the migration client
    await migrationClient.end();
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
