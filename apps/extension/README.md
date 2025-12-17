# Papercuts Extension

## Recommended (simple) workflow

Build once and load the production folder:

```bash
cd ../../
npm run build:ext
```

Then in Chrome:
- open `chrome://extensions`
- enable **Developer mode**
- click **Load unpacked**
- select `apps/extension/.output/chrome-mv3`

## Dev workflow (hot reload)

```bash
cd ../../
npm run dev:ext
```

Then load `apps/extension/.output/chrome-mv3-dev`.
