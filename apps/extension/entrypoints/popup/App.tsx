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
    'choose' | 'scratch' | 'screenshot-method'
  >('choose');
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');
  const [apiKey, setApiKey] = useState('');
  const [name, setName] = useState('New papercut');
  const [descriptionText, setDescriptionText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [imageBytes, setImageBytes] = useState<ArrayBuffer | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [activeTabUrl, setActiveTabUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);

  useEffect(() => {
    browser.storage.local.get(['papercuts_baseUrl', 'papercuts_apiKey']).then((res) => {
      const v = res['papercuts_baseUrl'];
      if (typeof v === 'string' && v.trim()) setBaseUrl(v);
      const k = res['papercuts_apiKey'];
      if (typeof k === 'string') setApiKey(k);
    });

    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        setActiveTabUrl(tab?.url ?? null);
        setActiveTabId(typeof tab?.id === 'number' ? tab.id : null);
      })
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

  const saveSettings = async () => {
    await browser.storage.local.set({
      papercuts_baseUrl: baseUrl,
      papercuts_apiKey: apiKey,
    });
  };

  const refreshCurrentTab = async () => {
    if (!activeTabId) return;
    try {
      await browser.tabs.reload(activeTabId);
      setError('Tab refreshed. Try capture again.');
    } catch {
      setError('Could not refresh the tab automatically. Please refresh it manually and try again.');
    }
  };

  const createFromScratch = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveSettings();
      const res = (await browser.runtime.sendMessage({
        type: 'CREATE_ONLY',
        baseUrl,
        apiKey,
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

  const startSelectArea = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveSettings();
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) return;
      if (isRestrictedUrl(tab.url)) {
        setError('Can’t capture on this page. Open any normal website tab and try again.');
        return;
      }
      // Start selection in the page and close popup so you can drag immediately.
      await browser.tabs.sendMessage(tab.id, {
        type: 'START_SELECTION_OPEN_FORM',
        baseUrl,
        apiKey,
      });
      window.close();
    } catch (e) {
      const msg = String((e as any)?.message ?? '');
      if (msg.includes('Receiving end does not exist') || msg.includes('Could not establish connection')) {
        setError(
          "This tab needs a refresh so the extension can inject the capture overlay. Refresh the page once, then try again."
        );
      } else {
        setError("Couldn’t start the area selector. Try reloading the extension and refreshing the tab.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const startCaptureVisible = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveSettings();
      if (isRestrictedUrl(activeTabUrl ?? undefined)) {
        setError('Can’t capture on this page. Open any normal website tab and try again.');
        return;
      }
      const res = (await browser.runtime.sendMessage({
        type: 'CAPTURE_VISIBLE_OPEN_FORM',
        baseUrl,
        apiKey,
      })) as { error?: string; ok?: boolean };
      if (res?.error) throw new Error(res.error);
      window.close();
    } catch (e) {
      setError('Could not capture the screen. Open a normal website tab and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="wrap">
      {error ? (
        <div className="error">
          <div>{error}</div>
          {error.toLowerCase().includes('refresh') ? (
            <button type="button" className="errorBtn" onClick={refreshCurrentTab}>
              Refresh this tab
            </button>
          ) : null}
        </div>
      ) : null}
      {step === 'choose' ? (
        <>
          <div className="title">Papercuts</div>
          <div className="sub">Create from scratch or from a screenshot.</div>

          <div className="field">
            <div className="label">Web app URL</div>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://your-app.vercel.app"
            />
          </div>

          <div className="field">
            <div className="label">API key</div>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Copy from the web app “Extension API key”"
            />
          </div>

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
                    : 'From screenshot'}
              </div>
              <div className="sub">
                {step === 'scratch'
                  ? 'Create without a screenshot.'
                  : step === 'screenshot-method'
                    ? 'Capture first, then add name + description.'
                    : 'Capture first, then add name + description.'}
              </div>
            </div>
          </div>

          {step === 'screenshot-method' ? (
            <>
              <div className="tiles">
                <button
                  type="button"
                  className="tile"
                  onClick={startSelectArea}
                  disabled={isSaving}
                >
                  <div className="tileTitle">Select area</div>
                  <div className="tileDesc">Drag a rectangle on the current page.</div>
                </button>
                <button
                  type="button"
                  className="tile"
                  onClick={startCaptureVisible}
                  disabled={isSaving}
                >
                  <div className="tileTitle">Capture visible screen</div>
                  <div className="tileDesc">Captures the current visible viewport.</div>
                </button>
              </div>
              <div className="hint">
                We’ll close this popup, start capture immediately, then open the web app form with the screenshot prefilled.
              </div>
            </>
          ) : (
            <>
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
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
