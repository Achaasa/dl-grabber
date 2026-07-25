# dl-grabber

Extract final download URLs from file-host pages in one click. Paste URLs, grab results, export to TXT/CSV, and feed them into IDM batch download.

## Structure

```
dl-grabber/
├── backend/          Express + Playwright API server
├── frontend/         React + Vite UI
├── render.yaml       Render deployment config
└── package.json      Root scripts
```

## Development

```bash
npm run dev
```

Starts both backend (`:3001`) and frontend (`:5173`) with hot-reload.

## Deployment (Render)

1. Push to GitHub
2. Connect repo on [Render](https://render.com)
3. Render reads `render.yaml` — it installs dependencies, builds the frontend, installs Chromium, and starts the server

No CORS config needed in production — the backend serves the frontend build as static files.
