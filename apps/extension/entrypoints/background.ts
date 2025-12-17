type CaptureVisibleRequest = {
  type: 'CAPTURE_VISIBLE';
  windowId?: number;
};

type UploadAndCreateRequest = {
  type: 'UPLOAD_AND_CREATE';
  baseUrl: string;
  name: string;
  descriptionText?: string;
  imageBytes: ArrayBuffer;
};

type CreateOnlyRequest = {
  type: 'CREATE_ONLY';
  baseUrl: string;
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

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (message, sender) => {
    const msg = message as
      | CaptureVisibleRequest
      | UploadAndCreateRequest
      | CreateOnlyRequest;

    if (msg?.type === 'CAPTURE_VISIBLE') {
      const windowId =
        typeof msg.windowId === 'number'
          ? msg.windowId
          : sender.tab?.windowId ?? undefined;
      const dataUrl = await browser.tabs.captureVisibleTab(windowId, {
        format: 'png',
      });
      return { dataUrl };
    }

    if (msg?.type === 'UPLOAD_AND_CREATE') {
      const baseUrl = normalizeBaseUrl(msg.baseUrl);
      const imageBlob = new Blob([msg.imageBytes], { type: 'image/png' });
      const form = new FormData();
      form.set('file', imageBlob, 'papercut.png');

      const uploadRes = await fetch(`${baseUrl}/api/uploads`, {
        method: 'POST',
        body: form,
      });
      if (!uploadRes.ok) {
        return { error: 'Upload failed' };
      }
      const uploadJson = (await uploadRes.json()) as { url: string };

      const createRes = await fetch(`${baseUrl}/api/papercuts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: msg.name,
          descriptionHtml: textToHtml(msg.descriptionText ?? ''),
          screenshotUrl: uploadJson.url,
        }),
      });
      if (!createRes.ok) {
        return { error: 'Create failed' };
      }
      const created = (await createRes.json()) as { item: any };

      await browser.tabs.create({ url: baseUrl });
      return { item: created.item };
    }

    if (msg?.type === 'CREATE_ONLY') {
      const baseUrl = normalizeBaseUrl(msg.baseUrl);
      const createRes = await fetch(`${baseUrl}/api/papercuts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
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
