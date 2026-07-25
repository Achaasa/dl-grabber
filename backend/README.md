# dl-extractor-api

Express + Playwright backend that extracts final download URLs from file-host pages (fuckingfast.co, pastebin, etc.).

## Stack

- **Runtime:** Node.js (ESM)
- **Framework:** Express 4
- **Browser automation:** Playwright 1.48 (Chromium)
- **Language:** TypeScript

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/extraction/start` | Start URL extraction |
| GET    | `/api/extraction/progress` | Poll extraction progress |
| POST   | `/api/extraction/cancel` | Cancel running extraction |
| GET    | `/api/extraction/settings` | Get current settings |
| POST   | `/api/extraction/settings` | Update settings |

## Development

```bash
npm run dev
```

Starts with `tsx watch` on port 3001.

## Production

```bash
npm run build
npm start
```
