import { serve } from '@hono/node-server';
import { app } from './index';

const port = Number(process.env.PORT) || 3001;

console.log(`API server starting on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`API server running at http://localhost:${port}/api`);
