type CaptureVisibleRequest = {
  type: 'CAPTURE_VISIBLE';
  windowId?: number;
};

type CaptureVisibleOpenFormRequest = {
  type: 'CAPTURE_VISIBLE_OPEN_COMPOSER';
  baseUrl: string;
  apiKey?: string;
};

type UploadAndCreateRequest = {
  type: 'UPLOAD_AND_CREATE';
  baseUrl: string;
  apiKey?: string;
  name: string;
  descriptionText?: string;
  imageBytes: ArrayBuffer;
};

type OpenComposerRequest = {
  type: 'OPEN_COMPOSER';
  screenshotDataUrl: string;
};

type RetakeSelectionRequest = {
  type: 'RETARGET_RETAKE_SELECTION';
  tabId: number;
};

type CreateOnlyRequest = {
  type: 'CREATE_ONLY';
  baseUrl: string;
  apiKey?: string;
  name: string;
  descriptionText?: string;
};

function normalizeBaseUrl(url?: string) {
  const trimmed = (url ?? '').trim().replace(/\/+$/, '');
  return trimmed || 'http://localhost:3000';
}

function textToHtml(text: string) {
  const escaped = text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  return `<p>${escaped.replaceAll('\n', '<br/>')}</p>`;
}

function imageAndTextToHtml(imageUrl: string, text: string) {
  const img = `<p><img src="${imageUrl}" alt="Screenshot" /></p>`;
  const rest = (text ?? '').trim() ? textToHtml(text) : '';
  return `${img}${rest}`;
}

function withApiKey(headers: Record<string, string>, apiKey?: string) {
  const k = (apiKey ?? '').trim();
  if (!k) return headers;
  return { ...headers, 'x-papercuts-key': k };
}

function buildComposerUrl(opts: { screenshotUrl?: string; sourceTabId?: number }) {
  const u = new URL(browser.runtime.getURL('composer.html'));
  if (opts.screenshotUrl) u.searchParams.set('screenshotUrl', opts.screenshotUrl);
  if (typeof opts.sourceTabId === 'number') u.searchParams.set('sourceTabId', String(opts.sourceTabId));
  // Cache-bust so repeated captures always open a fresh composer window
  u.searchParams.set('ts', String(Date.now()));
  return u.toString();
}

async function uploadImageToApp(opts: {
  baseUrl: string;
  apiKey?: string;
  imageBytes: ArrayBuffer;
}) {
  const baseUrl = normalizeBaseUrl(opts.baseUrl);
  const imageBlob = new Blob([opts.imageBytes], { type: 'image/png' });
  const form = new FormData();
  form.set('file', imageBlob, 'papercut.png');

  console.log('[Papercuts BG] Uploading to:', `${baseUrl}/api/uploads`);
  const uploadRes = await fetch(`${baseUrl}/api/uploads`, {
    method: 'POST',
    headers: withApiKey({}, opts.apiKey),
    body: form,
  });

  console.log('[Papercuts BG] Upload response status:', uploadRes.status, uploadRes.statusText);

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text().catch(() => 'Unknown error');
    console.error('[Papercuts BG] Upload failed with:', errorText);
    return { error: `Upload failed: ${uploadRes.status} ${errorText.slice(0, 100)}` as const };
  }
  const uploadJson = (await uploadRes.json()) as { url: string };
  return { url: uploadJson.url as string };
}

export default defineBackground(() => {
  // Use proper Chrome extension async message handling
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const msg = message as
      | CaptureVisibleRequest
      | CaptureVisibleOpenFormRequest
      | UploadAndCreateRequest
      | OpenComposerRequest
      | RetakeSelectionRequest
      | CreateOnlyRequest;

    // Handle async messages
    (async () => {
      try {
        if (msg?.type === 'CAPTURE_VISIBLE') {
          console.log('[Papercuts BG] Capturing visible tab...');
          try {
            const windowId =
              typeof msg.windowId === 'number'
                ? msg.windowId
                : sender.tab?.windowId ?? undefined;
            const dataUrl = await browser.tabs.captureVisibleTab(windowId, {
              format: 'png',
            });
            console.log('[Papercuts BG] Capture successful, dataUrl length:', dataUrl.length);
            sendResponse({ dataUrl });
          } catch (err) {
            console.error('[Papercuts BG] Capture failed:', err);
            sendResponse({ error: 'Capture failed: ' + String(err) });
          }
          return;
        }

        if (msg?.type === 'CAPTURE_VISIBLE_OPEN_COMPOSER') {
          console.log('[Papercuts BG] Capturing full visible screen and opening Composer...');
          try {
            const windowId = sender.tab?.windowId ?? undefined;
            const dataUrl = await browser.tabs.captureVisibleTab(windowId, {
              format: 'png',
            });
            const imageBytes = await (await fetch(dataUrl)).arrayBuffer();
            const uploaded = await uploadImageToApp({
              baseUrl: msg.baseUrl,
              apiKey: msg.apiKey,
              imageBytes,
            });
            if ('error' in uploaded) {
              sendResponse(uploaded);
              return;
            }

            console.log('[Papercuts BG] Upload successful, opening Composer...');
            const url = buildComposerUrl({ screenshotUrl: uploaded.url, sourceTabId: sender.tab?.id });

            try {
              const win = await browser.windows.create({ url, type: 'popup', width: 420, height: 720 });
              console.log('[Papercuts BG] Composer window opened:', win);
              sendResponse({ ok: true });
            } catch (windowErr) {
              console.error('[Papercuts BG] Failed to create window:', windowErr);
              console.log('[Papercuts BG] Falling back to tab...');
              await browser.tabs.create({ url, active: true });
              console.log('[Papercuts BG] Composer tab opened');
              sendResponse({ ok: true });
            }
          } catch (err) {
            console.error('[Papercuts BG] Capture/upload failed:', err);
            sendResponse({ error: 'Capture/upload failed: ' + String(err) });
          }
          return;
        }

        if (msg?.type === 'UPLOAD_AND_CREATE') {
          const baseUrl = normalizeBaseUrl(msg.baseUrl);
          const uploaded = await uploadImageToApp({
            baseUrl,
            apiKey: msg.apiKey,
            imageBytes: msg.imageBytes,
          });
          if ('error' in uploaded) {
            sendResponse(uploaded);
            return;
          }

          const createRes = await fetch(`${baseUrl}/api/papercuts`, {
            method: 'POST',
            headers: withApiKey({ 'content-type': 'application/json' }, msg.apiKey),
            body: JSON.stringify({
              name: msg.name,
              descriptionHtml: imageAndTextToHtml(uploaded.url, msg.descriptionText ?? ''),
              screenshotUrl: uploaded.url,
            }),
          });
          if (!createRes.ok) {
            sendResponse({ error: 'Create failed' });
            return;
          }
          const created = (await createRes.json()) as { item: any };
          sendResponse({ item: created.item });
          return;
        }

        if (msg?.type === 'OPEN_COMPOSER') {
          console.log('[Papercuts BG] Opening screenshot preview...');
          try {
            // Store screenshot data URL temporarily
            const storageKey = `screenshot_${Date.now()}`;

            // Store screenshot temporarily
            console.log('[Papercuts BG] Storing screenshot in session storage...');
            await browser.storage.session.set({ [storageKey]: msg.screenshotDataUrl });
            console.log('[Papercuts BG] Screenshot stored successfully');

            // Open screenshot preview page first
            const previewUrl = browser.runtime.getURL('screenshot-preview.html');
            const url = new URL(previewUrl);

            // Get source tab ID from sender
            if (sender.tab?.id) {
              url.searchParams.set('sourceTabId', String(sender.tab.id));
            }
            url.searchParams.set('screenshotKey', storageKey);
            url.searchParams.set('ts', String(Date.now()));

            try {
              await browser.tabs.create({ url: url.toString(), active: true });
              console.log('[Papercuts BG] Screenshot preview tab opened');
              sendResponse({ ok: true });
            } catch (err) {
              console.error('[Papercuts BG] Failed to open preview:', err);
              sendResponse({ error: 'Failed to open preview: ' + String(err) });
            }
          } catch (err) {
            console.error('[Papercuts BG] Exception:', err);
            sendResponse({ error: 'Failed to open preview: ' + String(err) });
          }
          return;
        }

        if (msg?.type === 'RETARGET_RETAKE_SELECTION') {
          try {
            await browser.tabs.update(msg.tabId, { active: true });
            await browser.tabs.sendMessage(msg.tabId, { type: 'START_SELECTION_OPEN_COMPOSER' });
            sendResponse({ ok: true });
          } catch {
            sendResponse({ error: 'Retake failed' });
          }
          return;
        }

        if (msg?.type === 'CREATE_ONLY') {
          const baseUrl = normalizeBaseUrl(msg.baseUrl);
          const createRes = await fetch(`${baseUrl}/api/papercuts`, {
            method: 'POST',
            headers: withApiKey({ 'content-type': 'application/json' }, msg.apiKey),
            body: JSON.stringify({
              name: msg.name,
              descriptionHtml: textToHtml(msg.descriptionText ?? ''),
              screenshotUrl: null,
            }),
          });
          if (!createRes.ok) {
            sendResponse({ error: 'Create failed' });
            return;
          }
          const created = (await createRes.json()) as { item: any };
          sendResponse({ item: created.item });
          return;
        }
      } catch (err) {
        console.error('[Papercuts BG] Unexpected error:', err);
        sendResponse({ error: String(err) });
      }
    })();

    // Return true to indicate we'll respond asynchronously
    return true;
  });

  browser.commands.onCommand.addListener(async (command) => {
    if (command !== 'capture_papercut') return;
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;
    // Prefer sending baseUrl/apiKey (but content script also has a fallback to storage).
    const stored = await browser.storage.local.get(['papercuts_connect']);
    const connect = typeof stored['papercuts_connect'] === 'string' ? stored['papercuts_connect'] : '';
    let baseUrl: string | undefined = undefined;
    let apiKey: string | undefined = undefined;
    if (connect.startsWith('papercuts:')) {
      const rest = connect.slice('papercuts:'.length);
      const [b, k] = rest.split('#');
      if (b?.trim()) baseUrl = b.trim();
      if (k?.trim()) apiKey = k.trim();
    }
    await browser.tabs.sendMessage(tab.id, { type: 'START_SELECTION_OPEN_COMPOSER', baseUrl, apiKey });
  });
});
