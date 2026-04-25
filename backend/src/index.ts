import { createApp } from './app';

const { app } = createApp();

if (process.env.NODE_ENV !== 'vercel') {
  app.listen(4000, () => {
    console.log(`\n🎓 AI Tutor Agent v2 running on http://localhost:4000`);
  });
}

export { app };
