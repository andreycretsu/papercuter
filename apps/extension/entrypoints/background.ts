type CaptureVisibleRequest = {
  type: 'CAPTURE_VISIBLE';
  windowId?: number;
};

type CaptureVisibleOpenFormRequest = {
  type: 'CAPTURE_VISIBLE_OPEN_FORM';
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
  type: 'UPLOAD_AND_OPEN_FORM';
  baseUrl: string;
  apiKey?: string;
  imageBytes: ArrayBuffer;
};

type CreateOnlyRequest = {
  type: 'CREATE_ONLY';
  baseUrl: string;
  apiKey?: string;
  name: string;
  descriptionText?: string;
};

function normalizeBaseUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, '');
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

function buildNewPapercutUrl(baseUrl: string, screenshotUrl?: string) {
  const u = new URL(baseUrl);
  u.searchParams.set('new', '1');
  if (screenshotUrl) u.searchParams.set('screenshotUrl', screenshotUrl);
  u.searchParams.set('from', 'extension');
  // Cache-bust so you always get a fresh render when opening repeatedly
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

    if (msg?.type === 'CAPTURE_VISIBLE_OPEN_FORM') {
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

        const target = buildNewPapercutUrl(normalizeBaseUrl(msg.baseUrl), uploaded.url);
        await browser.tabs.create({ url: target });
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

      await browser.tabs.create({ url: baseUrl });
      return { item: created.item };
    }

    if (msg?.type === 'UPLOAD_AND_OPEN_FORM') {
      const uploaded = await uploadImageToApp({
        baseUrl: msg.baseUrl,
        apiKey: msg.apiKey,
        imageBytes: msg.imageBytes,
      });
      if ('error' in uploaded) return uploaded;

      const target = buildNewPapercutUrl(normalizeBaseUrl(msg.baseUrl), uploaded.url);
      await browser.tabs.create({ url: target });
      return { ok: true };
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
      await browser.tabs.create({ url: baseUrl });
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
    await browser.tabs.sendMessage(tab.id, { type: 'START_SELECTION' });
  });
});
