import { useEffect, useState } from 'react';
import './App.css';

async function dataUrlToBytes(dataUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(dataUrl);
  return await res.arrayBuffer();
}

function isRestrictedUrl(url: string | undefined) {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('file://')
  );
}

function App() {
  const [step, setStep] = useState<
    'choose' | 'scratch' | 'screenshot-method' | 'screenshot-form'
  >('choose');
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');
  const [name, setName] = useState('New papercut');
  const [descriptionText, setDescriptionText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [imageBytes, setImageBytes] = useState<ArrayBuffer | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [activeTabUrl, setActiveTabUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    browser.storage.local.get('papercuts_baseUrl').then((res) => {
      const v = res['papercuts_baseUrl'];
      if (typeof v === 'string' && v.trim()) setBaseUrl(v);
    });

    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => setActiveTabUrl(tab?.url ?? null))
      .catch(() => setActiveTabUrl(null));
  }, []);

  const resetDraft = () => {
    setName('New papercut');
    setDescriptionText('');
    setImageBytes(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setError(null);
  };

  const createFromScratch = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await browser.storage.local.set({ papercuts_baseUrl: baseUrl });
      const res = (await browser.runtime.sendMessage({
        type: 'CREATE_ONLY',
        baseUrl,
        name: name.trim() || 'New papercut',
        descriptionText,
      })) as { error?: string };
      if (res?.error) throw new Error(res.error);
      window.close();
    } catch (e) {
      setError('Could not create papercut. Is the web app URL correct and running?');
    } finally {
      setIsSaving(false);
    }
  };

  const captureSelectArea = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await browser.storage.local.set({ papercuts_baseUrl: baseUrl });
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) return;
      if (isRestrictedUrl(tab.url)) {
        setError('Can’t capture on this page. Open any normal website tab and try again.');
        return;
      }
      const res = (await browser.tabs.sendMessage(tab.id, {
        type: 'CAPTURE_AREA',
      })) as { cancelled?: boolean; imageBytes?: ArrayBuffer };
      if (res?.cancelled || !res?.imageBytes) return;

      const bytes = res.imageBytes;
      setImageBytes(bytes);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
      setImagePreviewUrl(url);
      setStep('screenshot-form');
    } catch (e) {
      setError(
        "Couldn’t start the area selector. Open a normal website tab (not chrome://extensions) and try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const captureVisibleScreen = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await browser.storage.local.set({ papercuts_baseUrl: baseUrl });
      if (isRestrictedUrl(activeTabUrl ?? undefined)) {
        setError('Can’t capture on this page. Open any normal website tab and try again.');
        return;
      }
      const cap = (await browser.runtime.sendMessage({
        type: 'CAPTURE_VISIBLE',
      })) as { dataUrl: string };
      const bytes = await dataUrlToBytes(cap.dataUrl);
      setImageBytes(bytes);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
      setImagePreviewUrl(url);
      setStep('screenshot-form');
    } catch (e) {
      setError('Could not capture the screen. Open a normal website tab and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const createFromScreenshot = async () => {
    if (isSaving) return;
    if (!imageBytes) return;
    setIsSaving(true);
    try {
      await browser.storage.local.set({ papercuts_baseUrl: baseUrl });
      const res = (await browser.runtime.sendMessage({
        type: 'UPLOAD_AND_CREATE',
        baseUrl,
        name: name.trim() || 'New papercut',
        descriptionText,
        imageBytes,
      })) as { error?: string };
      if (res?.error) throw new Error(res.error);
      window.close();
    } catch (e) {
      setError('Could not upload/create. Is the web app URL correct and running?');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="wrap">
      {error ? <div className="error">{error}</div> : null}
      {step === 'choose' ? (
        <>
          <div className="title">Papercuts</div>
          <div className="sub">Create from scratch or from a screenshot.</div>

          <div className="tiles">
            <button
              type="button"
              className="tile"
              onClick={() => {
                resetDraft();
                setStep('screenshot-method');
              }}
            >
              <div className="tileTitle">Create from screenshot</div>
              <div className="tileDesc">Select an area or capture the visible screen.</div>
            </button>
            <button
              type="button"
              className="tile"
              onClick={() => {
                resetDraft();
                setStep('scratch');
              }}
            >
              <div className="tileTitle">Create from scratch</div>
              <div className="tileDesc">Create a papercut without a screenshot.</div>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="header">
            <button
              type="button"
              className="back"
              onClick={() => {
                resetDraft();
                setStep('choose');
              }}
              aria-label="Back"
            >
              ←
            </button>
            <div>
              <div className="title">
                {step === 'scratch'
                  ? 'From scratch'
                  : step === 'screenshot-method'
                    ? 'From screenshot'
                    : 'Screenshot details'}
              </div>
              <div className="sub">
                {step === 'scratch'
                  ? 'Create without a screenshot.'
                  : step === 'screenshot-method'
                    ? 'Capture first, then add name + description.'
                    : 'Name + description (screenshot already attached).'}
              </div>
            </div>
          </div>

          {step === 'screenshot-method' ? (
            <>
              <div className="tiles">
                <button
                  type="button"
                  className="tile"
                  onClick={captureSelectArea}
                  disabled={isSaving}
                >
                  <div className="tileTitle">Select area</div>
                  <div className="tileDesc">Drag a rectangle on the current page.</div>
                </button>
                <button
                  type="button"
                  className="tile"
                  onClick={captureVisibleScreen}
                  disabled={isSaving}
                >
                  <div className="tileTitle">Capture visible screen</div>
                  <div className="tileDesc">Captures the current visible viewport.</div>
                </button>
              </div>
              <div className="hint">
                After capture, we’ll show the form. (Tip: capturing won’t work on `chrome://` pages.)
              </div>
            </>
          ) : (
            <>
              {step === 'screenshot-form' && imagePreviewUrl ? (
                <div className="preview">
                  <img src={imagePreviewUrl} alt="Screenshot preview" />
                </div>
              ) : null}

              <div className="field">
                <div className="label">Web app URL</div>
                <input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:3000"
                />
              </div>

              <div className="field">
                <div className="label">Name</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Short title"
                />
              </div>

              <div className="field">
                <div className="label">Quick description</div>
                <textarea
                  value={descriptionText}
                  onChange={(e) => setDescriptionText(e.target.value)}
                  placeholder="Optional…"
                  rows={4}
                />
              </div>

              {step === 'scratch' ? (
                <button className="primary" onClick={createFromScratch} disabled={isSaving}>
                  {isSaving ? 'Creating…' : 'Create papercut'}
                </button>
              ) : (
                <>
                  <button
                    className="primary"
                    onClick={createFromScreenshot}
                    disabled={isSaving || !imageBytes}
                  >
                    {isSaving ? 'Creating…' : 'Create papercut'}
                  </button>
                  <div className="hint">
                    Screenshot will be attached and inserted into the description automatically.
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
