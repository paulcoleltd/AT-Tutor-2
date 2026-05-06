import path from 'path';
import fs   from 'fs';
import express from 'express';
import { createApp } from './app';

const { app } = createApp();

// Serve the React build as static files when it exists.
// This is used by Railway and Render (single-service deployments where the
// backend binary also acts as the static file server).
// Vercel uses a separate CDN for the frontend, so this block is skipped there.
const frontendDist = path.join(process.cwd(), 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { maxAge: '1d' }));
  // SPA fallback: any GET that doesn't match /api/* serves index.html
  app.get(/^(?!\/api\/).*$/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

if (process.env.NODE_ENV !== 'vercel') {
  const port = parseInt(process.env.PORT ?? '4000', 10);
  app.listen(port, () => {
    console.log(`\n🎓 AI Tutor Agent v2 running on http://localhost:${port}`);
    if (fs.existsSync(frontendDist)) {
      console.log(`   Frontend served from ${frontendDist}`);
    }
  });
}

export { app };
