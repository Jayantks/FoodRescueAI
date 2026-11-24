import { accessSync, constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createAuthRouter } from './auth.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const webDirectory = fileURLToPath(new URL('../../web/dist/', import.meta.url));

app.disable('x-powered-by');
app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'foodrescue-ai-api' });
});
const sessionSecret = process.env.AUTH_SESSION_SECRET;
if (sessionSecret !== undefined && Buffer.byteLength(sessionSecret) < 32) {
  throw new Error('AUTH_SESSION_SECRET must be at least 32 bytes.');
}
app.use('/api', createAuthRouter({ secret: sessionSecret, secureCookie: process.env.AUTH_COOKIE_SECURE === 'true' }));
app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'Endpoint not found' });
});

try {
  accessSync(webDirectory, constants.R_OK);
  app.use(express.static(webDirectory));
} catch {
  // Vite serves the UI in development before a production build exists.
}

app.listen(port, process.env.HOST ?? '127.0.0.1', (error) => {
  if (error) {
    console.error('Could not start the FoodRescue AI API:', error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`FoodRescue AI API listening on port ${port}`);
});
