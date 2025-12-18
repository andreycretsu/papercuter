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

type UploadAndOpenFormRequest = {
  type: 'UPLOAD_AND_OPEN_COMPOSER';
  baseUrl: string;
  apiKey?: string;
  imageBytes: ArrayBuffer;
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

  const uploadRes = await fetch(`${baseUrl}/api/uploads`, {
    method: 'POST',
    headers: withApiKey({}, opts.apiKey),
    body: form,
  });
  if (!uploadRes.ok) {
    return { error: 'Upload failed' as const };
  }
  const uploadJson = (await uploadRes.json()) as { url: string };
  return { url: uploadJson.url as string };
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (message, sender) => {
    const msg = message as
      | CaptureVisibleRequest
      | CaptureVisibleOpenFormRequest
      | UploadAndCreateRequest
      | UploadAndOpenFormRequest
      | RetakeSelectionRequest
      | CreateOnlyRequest;

    if (msg?.type === 'CAPTURE_VISIBLE') {
      try {
        const windowId =
          typeof msg.windowId === 'number'
            ? msg.windowId
            : sender.tab?.windowId ?? undefined;
        const dataUrl = await browser.tabs.captureVisibleTab(windowId, {
          format: 'png',
        });
        return { dataUrl };
      } catch {
        return { error: 'Capture failed' };
      }
    }

    if (msg?.type === 'CAPTURE_VISIBLE_OPEN_COMPOSER') {
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
        if ('error' in uploaded) return uploaded;

        const url = buildComposerUrl({ screenshotUrl: uploaded.url, sourceTabId: sender.tab?.id });
        await browser.windows.create({ url, type: 'popup', width: 420, height: 720 });
        return { ok: true };
      } catch {
        return { error: 'Capture/upload failed' };
      }
    }

    if (msg?.type === 'UPLOAD_AND_CREATE') {
      const baseUrl = normalizeBaseUrl(msg.baseUrl);
      const uploaded = await uploadImageToApp({
        baseUrl,
        apiKey: msg.apiKey,
        imageBytes: msg.imageBytes,
      });
      if ('error' in uploaded) return uploaded;

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
        return { error: 'Create failed' };
      }
      const created = (await createRes.json()) as { item: any };
      return { item: created.item };
    }

    if (msg?.type === 'UPLOAD_AND_OPEN_COMPOSER') {
      const uploaded = await uploadImageToApp({
        baseUrl: msg.baseUrl,
        apiKey: msg.apiKey,
        imageBytes: msg.imageBytes,
      });
      if ('error' in uploaded) return uploaded;

      const url = buildComposerUrl({ screenshotUrl: uploaded.url, sourceTabId: sender.tab?.id });
      await browser.windows.create({ url, type: 'popup', width: 420, height: 720 });
      return { ok: true };
    }

    if (msg?.type === 'RETARGET_RETAKE_SELECTION') {
      try {
        await browser.tabs.update(msg.tabId, { active: true });
        await browser.tabs.sendMessage(msg.tabId, { type: 'START_SELECTION_OPEN_COMPOSER' });
        return { ok: true };
      } catch {
        return { error: 'Retake failed' };
      }
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
        return { error: 'Create failed' };
      }
      const created = (await createRes.json()) as { item: any };
      return { item: created.item };
    }
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
