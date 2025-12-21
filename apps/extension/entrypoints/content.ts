type StartSelectionMessage = {
  type: 'START_SELECTION';
  baseUrl?: string;
  name?: string;
  descriptionText?: string;
};

type CaptureAreaMessage = {
  type: 'CAPTURE_AREA';
};

type StartSelectionOpenFormMessage = {
  type: 'START_SELECTION_OPEN_COMPOSER';
  baseUrl?: string;
  apiKey?: string;
};

type ShowPreviewModalMessage = {
  type: 'SHOW_PREVIEW_MODAL';
  screenshotDataUrl: string;
  baseUrl: string;
  apiKey: string;
};

function parseConnectCode(code: string): { baseUrl: string; apiKey: string } | null {
  const trimmed = (code ?? '').trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('papercuts:')) return null;
  const rest = trimmed.slice('papercuts:'.length);
  const [baseUrlRaw, apiKeyRaw] = rest.split('#');
  const baseUrl = (baseUrlRaw ?? '').trim().replace(/\/+$/, '');
  const apiKey = (apiKeyRaw ?? '').trim();
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey };
}

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

let isCapturing = false;

async function selectAreaBytes(): Promise<ArrayBuffer | null> {
  // Prevent multiple capture instances
  if (isCapturing) {
    console.log('[Papercuts] Capture already in progress, ignoring...');
    return null;
  }

  isCapturing = true;
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

      try {
        const capture = (await browser.runtime.sendMessage({
          type: 'CAPTURE_VISIBLE',
        })) as { dataUrl?: string; error?: string };

        if (!capture || capture.error || !capture.dataUrl) {
          console.error('[Papercuts] Capture failed:', capture?.error ?? 'No dataUrl returned');
          window.alert('Papercuts: Failed to capture screenshot. Please try again.');
          return done(null);
        }

        const bytes = await cropToPngBytes({
          dataUrl: capture.dataUrl,
          rect,
          dpr: window.devicePixelRatio || 1,
        });

        done(bytes);
      } catch (err) {
        console.error('[Papercuts] Exception during capture:', err);
        window.alert('Papercuts: Screenshot capture failed. Please try again.');
        done(null);
      }
    },
    true
  );

  const result = await promise;
  isCapturing = false;
  return result;
}

function createPreviewModal(opts: {
  screenshotDataUrl: string;
  onConfirm: (editedDataUrl: string) => void;
  onRetake: () => void;
}) {
  // Create modal backdrop
  const modalBackdrop = document.createElement('div');
  modalBackdrop.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    z-index: 2147483646;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
  `;

  // Create modal container (80% of screen)
  const modal = document.createElement('div');
  modal.style.cssText = `
    width: 80vw;
    height: 80vh;
    background: rgba(30, 30, 30, 0.98);
    border-radius: 16px;
    padding: 32px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    text-align: center;
    margin-bottom: 24px;
    color: white;
  `;
  header.innerHTML = `
    <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px 0; font-family: system-ui, -apple-system, sans-serif;">Review & Annotate Screenshot</h1>
    <p style="color: rgba(255, 255, 255, 0.7); margin: 0; font-size: 14px; font-family: system-ui, -apple-system, sans-serif;">Draw on the screenshot to highlight important areas, then confirm or retake.</p>
  `;

  // Drawing tools
  const drawingTools = document.createElement('div');
  drawingTools.style.cssText = `
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  `;

  const colorPicker = document.createElement('input');
  colorPicker.type = 'color';
  colorPicker.value = '#ff0000';
  colorPicker.style.cssText = `
    width: 40px;
    height: 32px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  `;

  const penSizeSlider = document.createElement('input');
  penSizeSlider.type = 'range';
  penSizeSlider.min = '1';
  penSizeSlider.max = '10';
  penSizeSlider.value = '3';
  penSizeSlider.style.width = '100px';

  const penSizeLabel = document.createElement('span');
  penSizeLabel.textContent = '3px';
  penSizeLabel.style.cssText = 'color: white; font-size: 14px; font-family: system-ui, -apple-system, sans-serif;';

  penSizeSlider.addEventListener('input', () => {
    penSizeLabel.textContent = `${penSizeSlider.value}px`;
  });

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear Annotations';
  clearBtn.style.cssText = `
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-family: system-ui, -apple-system, sans-serif;
    transition: background 0.2s;
  `;
  clearBtn.onmouseover = () => clearBtn.style.background = 'rgba(255, 255, 255, 0.15)';
  clearBtn.onmouseout = () => clearBtn.style.background = 'rgba(255, 255, 255, 0.1)';

  const colorLabel = document.createElement('label');
  colorLabel.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: white;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  colorLabel.innerHTML = 'Color:';
  colorLabel.appendChild(colorPicker);

  const sizeLabel = document.createElement('label');
  sizeLabel.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: white;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  sizeLabel.innerHTML = 'Pen Size:';
  sizeLabel.appendChild(penSizeSlider);
  sizeLabel.appendChild(penSizeLabel);

  drawingTools.appendChild(colorLabel);
  drawingTools.appendChild(sizeLabel);
  drawingTools.appendChild(clearBtn);

  // Canvas container
  const canvasContainer = document.createElement('div');
  canvasContainer.style.cssText = `
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    padding: 20px;
    overflow: auto;
    margin-bottom: 24px;
  `;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    max-width: 100%;
    max-height: 100%;
    cursor: crosshair;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    background: white;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  `;

  // Load image onto canvas
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
    }
  };
  img.src = opts.screenshotDataUrl;

  canvasContainer.appendChild(canvas);

  // Drawing state
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  const startDrawing = (e: MouseEvent) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    lastX = (e.clientX - rect.left) * scaleX;
    lastY = (e.clientY - rect.top) * scaleY;
  };

  const draw = (e: MouseEvent) => {
    if (!isDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.strokeStyle = colorPicker.value;
    ctx.lineWidth = Number(penSizeSlider.value);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastX = x;
    lastY = y;
  };

  const stopDrawing = () => {
    isDrawing = false;
  };

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  clearBtn.addEventListener('click', () => {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    }
  });

  // Actions
  const actions = document.createElement('div');
  actions.style.cssText = `
    display: flex;
    justify-content: center;
    gap: 16px;
  `;

  const retakeBtn = document.createElement('button');
  retakeBtn.textContent = 'Retake Screenshot';
  retakeBtn.style.cssText = `
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-family: system-ui, -apple-system, sans-serif;
    transition: background 0.2s;
  `;
  retakeBtn.onmouseover = () => retakeBtn.style.background = 'rgba(255, 255, 255, 0.15)';
  retakeBtn.onmouseout = () => retakeBtn.style.background = 'rgba(255, 255, 255, 0.1)';

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = 'Confirm & Continue';
  confirmBtn.style.cssText = `
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    background: #0066cc;
    color: white;
    font-family: system-ui, -apple-system, sans-serif;
    transition: background 0.2s;
  `;
  confirmBtn.onmouseover = () => confirmBtn.style.background = '#0052a3';
  confirmBtn.onmouseout = () => confirmBtn.style.background = '#0066cc';

  retakeBtn.addEventListener('click', () => {
    modalBackdrop.remove();
    opts.onRetake();
  });

  confirmBtn.addEventListener('click', () => {
    const editedDataUrl = canvas.toDataURL('image/png');
    modalBackdrop.remove();
    opts.onConfirm(editedDataUrl);
  });

  actions.appendChild(retakeBtn);
  actions.appendChild(confirmBtn);

  // Assemble modal
  modal.appendChild(header);
  modal.appendChild(drawingTools);
  modal.appendChild(canvasContainer);
  modal.appendChild(actions);
  modalBackdrop.appendChild(modal);

  return modalBackdrop;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    browser.runtime.onMessage.addListener(async (message) => {
      const msg = message as
        | StartSelectionMessage
        | CaptureAreaMessage
        | StartSelectionOpenFormMessage
        | ShowPreviewModalMessage;

      // Popup flow: capture only, return bytes to popup (no auto-create)
      if (msg?.type === 'CAPTURE_AREA') {
        const imageBytes = await selectAreaBytes();
        if (!imageBytes) return { cancelled: true };
        return { imageBytes };
      }

      // Popup flow: capture area, show preview modal, then open composer
      if (msg?.type === 'START_SELECTION_OPEN_COMPOSER') {
        console.log('[Papercuts] Starting area selection flow...');
        const imageBytes = await selectAreaBytes();
        if (!imageBytes) {
          console.log('[Papercuts] Area selection cancelled');
          return { cancelled: true };
        }

        console.log('[Papercuts] Area captured, resolving credentials...');
        let baseUrl = msg.baseUrl;
        let apiKey = msg.apiKey;
        if (!baseUrl || !apiKey) {
          const stored = await browser.storage.local.get(['papercuts_connect']);
          const parsed = parseConnectCode(typeof stored['papercuts_connect'] === 'string' ? stored['papercuts_connect'] : '');
          baseUrl = baseUrl ?? parsed?.baseUrl;
          apiKey = apiKey ?? parsed?.apiKey;
        }

        if (!baseUrl) {
          console.error('[Papercuts] Missing Connect code');
          window.alert('Papercuts: Missing Connect code. Open the extension popup and paste it first.');
          return { error: 'Missing connect code' };
        }

        console.log('[Papercuts] Showing preview modal...');
        try {
          // Convert imageBytes to data URL for preview
          const blob = new Blob([imageBytes], { type: 'image/png' });
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          // Show preview modal with screenshot
          const modal = createPreviewModal({
            screenshotDataUrl: dataUrl,
            onConfirm: async (editedDataUrl: string) => {
              console.log('[Papercuts] Screenshot confirmed, opening Composer...');

              // Convert edited data URL back to bytes
              const editedBlob = await (await fetch(editedDataUrl)).blob();
              const editedBytes = new Uint8Array(await editedBlob.arrayBuffer());

              // Store credentials and screenshot
              await browser.storage.local.set({
                papercuts_connect: `papercuts:${baseUrl}#${apiKey}`,
                pending_screenshot_bytes: Array.from(editedBytes)
              });

              // Ask background script to open composer (content scripts can't use tabs API)
              await browser.runtime.sendMessage({
                type: 'OPEN_COMPOSER_TAB'
              });
            },
            onRetake: async () => {
              console.log('[Papercuts] Retaking screenshot...');
              // Restart the flow
              await browser.runtime.sendMessage({
                type: 'START_SELECTION_OPEN_COMPOSER',
                baseUrl,
                apiKey
              });
            }
          });

          document.documentElement.appendChild(modal);
          return { ok: true };
        } catch (err) {
          console.error('[Papercuts] Exception:', err);
          window.alert('Papercuts: Failed to show preview. Check console for details.');
          return { error: String(err) };
        }
      }

      // Handle showing preview modal directly (for retakes)
      if (msg?.type === 'SHOW_PREVIEW_MODAL') {
        const modal = createPreviewModal({
          screenshotDataUrl: msg.screenshotDataUrl,
          onConfirm: async (editedDataUrl: string) => {
            const editedBlob = await (await fetch(editedDataUrl)).blob();
            const editedBytes = new Uint8Array(await editedBlob.arrayBuffer());

            await browser.storage.local.set({
              papercuts_connect: `papercuts:${msg.baseUrl}#${msg.apiKey}`,
              pending_screenshot_bytes: Array.from(editedBytes)
            });

            await browser.runtime.sendMessage({
              type: 'OPEN_COMPOSER_TAB'
            });
          },
          onRetake: async () => {
            await browser.runtime.sendMessage({
              type: 'START_SELECTION_OPEN_COMPOSER',
              baseUrl: msg.baseUrl,
              apiKey: msg.apiKey
            });
          }
        });
        document.documentElement.appendChild(modal);
        return { ok: true };
      }

      // Shortcut / legacy flow: capture area and create immediately with defaults
      if (msg?.type === 'START_SELECTION') {
        const imageBytes = await selectAreaBytes();
        if (!imageBytes) return;

        const stored = await browser.storage.local.get(['papercuts_connect']);
        const connect = typeof stored['papercuts_connect'] === 'string' ? stored['papercuts_connect'] : '';
        let baseUrl = msg.baseUrl ?? 'http://localhost:3000';
        let apiKey: string | undefined = undefined;
        if (connect.startsWith('papercuts:')) {
          const rest = connect.slice('papercuts:'.length);
          const [b, k] = rest.split('#');
          if (b?.trim()) baseUrl = b.trim();
          if (k?.trim()) apiKey = k.trim();
        }

        await browser.runtime.sendMessage({
          type: 'UPLOAD_AND_CREATE',
          baseUrl,
          apiKey,
          name: msg.name ?? 'New papercut',
          descriptionText: msg.descriptionText ?? '',
          imageBytes,
        });
      }
    });
  },
});
