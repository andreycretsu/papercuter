type StartSelectionMessage = {
  type: 'START_SELECTION';
  baseUrl?: string;
  name?: string;
  descriptionText?: string;
};

type CaptureAreaMessage = {
  type: 'CAPTURE_AREA';
};

function createOverlay() {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '2147483647';
  overlay.style.cursor = 'crosshair';
  overlay.style.background = 'rgba(0,0,0,0.15)';

  const box = document.createElement('div');
  box.style.position = 'fixed';
  box.style.border = '1px solid rgba(255,255,255,0.95)';
  box.style.background = 'rgba(0,0,0,0.25)';
  box.style.display = 'none';
  overlay.appendChild(box);

  const hint = document.createElement('div');
  hint.textContent = 'Drag to select an area • Esc to cancel';
  hint.style.position = 'fixed';
  hint.style.left = '12px';
  hint.style.top = '12px';
  hint.style.padding = '8px 10px';
  hint.style.borderRadius = '10px';
  hint.style.border = '1px solid rgba(255,255,255,0.35)';
  hint.style.background = 'rgba(0,0,0,0.55)';
  hint.style.color = 'white';
  hint.style.font = '14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  overlay.appendChild(hint);

  return { overlay, box, hint };
}

async function cropToPngBytes(opts: {
  dataUrl: string;
  rect: { x: number; y: number; width: number; height: number };
  dpr: number;
}): Promise<ArrayBuffer> {
  const img = new Image();
  img.src = opts.dataUrl;
  await img.decode();

  const sx = Math.max(0, Math.round(opts.rect.x * opts.dpr));
  const sy = Math.max(0, Math.round(opts.rect.y * opts.dpr));
  const sw = Math.max(1, Math.round(opts.rect.width * opts.dpr));
  const sh = Math.max(1, Math.round(opts.rect.height * opts.dpr));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png');
  });
  return await blob.arrayBuffer();
}

async function selectAreaBytes(): Promise<ArrayBuffer | null> {
  const { overlay, box } = createOverlay();
  document.documentElement.appendChild(overlay);

  let startX = 0;
  let startY = 0;
  let dragging = false;

  let resolved = false;
  let resolvePromise: (v: ArrayBuffer | null) => void = () => {};
  const promise = new Promise<ArrayBuffer | null>((resolve) => {
    resolvePromise = resolve;
  });

  const done = (val: ArrayBuffer | null) => {
    if (resolved) return;
    resolved = true;
    resolvePromise(val);
  };

  const cleanup = () => {
    overlay.remove();
    window.removeEventListener('keydown', onKeyDown, true);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cleanup();
      done(null);
    }
  };
  window.addEventListener('keydown', onKeyDown, true);

  overlay.addEventListener(
    'mousedown',
    (e) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      box.style.display = 'block';
      box.style.left = `${startX}px`;
      box.style.top = `${startY}px`;
      box.style.width = `0px`;
      box.style.height = `0px`;
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );

  overlay.addEventListener(
    'mousemove',
    (e) => {
      if (!dragging) return;
      const x1 = Math.min(startX, e.clientX);
      const y1 = Math.min(startY, e.clientY);
      const x2 = Math.max(startX, e.clientX);
      const y2 = Math.max(startY, e.clientY);
      box.style.left = `${x1}px`;
      box.style.top = `${y1}px`;
      box.style.width = `${x2 - x1}px`;
      box.style.height = `${y2 - y1}px`;
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );

  overlay.addEventListener(
    'mouseup',
    async (e) => {
      if (!dragging) return;
      dragging = false;

      const x1 = Math.min(startX, e.clientX);
      const y1 = Math.min(startY, e.clientY);
      const x2 = Math.max(startX, e.clientX);
      const y2 = Math.max(startY, e.clientY);

      const rect = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
      cleanup();

      if (rect.width < 8 || rect.height < 8) return done(null);

      const capture = (await browser.runtime.sendMessage({
        type: 'CAPTURE_VISIBLE',
      })) as { dataUrl: string };

      const bytes = await cropToPngBytes({
        dataUrl: capture.dataUrl,
        rect,
        dpr: window.devicePixelRatio || 1,
      });

      done(bytes);
    },
    true
  );

  return await promise;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    browser.runtime.onMessage.addListener(async (message) => {
      const msg = message as StartSelectionMessage | CaptureAreaMessage;

      // Popup flow: capture only, return bytes to popup (no auto-create)
      if (msg?.type === 'CAPTURE_AREA') {
        const imageBytes = await selectAreaBytes();
        if (!imageBytes) return { cancelled: true };
        return { imageBytes };
      }

      // Shortcut / legacy flow: capture area and create immediately with defaults
      if (msg?.type === 'START_SELECTION') {
        const imageBytes = await selectAreaBytes();
        if (!imageBytes) return;

        const stored = await browser.storage.local.get('papercuts_baseUrl');
        const baseUrl =
          typeof stored['papercuts_baseUrl'] === 'string' && stored['papercuts_baseUrl'].trim()
            ? stored['papercuts_baseUrl']
            : msg.baseUrl ?? 'http://localhost:3000';

        await browser.runtime.sendMessage({
          type: 'UPLOAD_AND_CREATE',
          baseUrl,
          name: msg.name ?? 'New papercut',
          descriptionText: msg.descriptionText ?? '',
          imageBytes,
        });
      }
    });
  },
});
