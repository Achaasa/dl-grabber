import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import extractionRouter from './routes/extraction.js';

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors(isProd ? { origin: false } : { origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/extraction', extractionRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (isProd) {
  const distPath = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${isProd ? 'production' : 'development'})`);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  process.exit(0);
});
