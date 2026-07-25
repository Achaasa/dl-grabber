# dl-extractor-ui

React + Vite frontend for the download link extraction tool. Dark-themed UI that lets users paste URLs, configure extraction settings, monitor progress, and export results.

## Stack

- **UI:** React 18
- **Build:** Vite 5
- **Styling:** Tailwind CSS 3
- **Language:** TypeScript

## Development

```bash
npm run dev
```

Starts Vite dev server on port 5173, proxies `/api` to `localhost:3001`.

## Production

```bash
npm run build
```

Outputs to `dist/` — serve these static files from the backend.
