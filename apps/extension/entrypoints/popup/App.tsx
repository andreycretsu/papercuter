import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import '../globals.css';
import './App.css';

async function dataUrlToBytes(dataUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(dataUrl);
  return await res.arrayBuffer();
}

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
  const [connectCode, setConnectCode] = useState('');
  const parsed = parseConnectCode(connectCode);
  const baseUrl = parsed?.baseUrl ?? '';
  const apiKey = parsed?.apiKey ?? '';
  const [name, setName] = useState('New papercut');
  const [descriptionText, setDescriptionText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [imageBytes, setImageBytes] = useState<ArrayBuffer | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [activeTabUrl, setActiveTabUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);

  const resetDraft = () => {
    setName('New papercut');
    setDescriptionText('');
    setImageBytes(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setError(null);
  };

  useEffect(() => {
    browser.storage.local.get(['papercuts_connect']).then((res) => {
      const c = res['papercuts_connect'];
      if (typeof c === 'string') setConnectCode(c);
    });

    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        setActiveTabUrl(tab?.url ?? null);
        setActiveTabId(typeof tab?.id === 'number' ? tab.id : null);
      })
      .catch(() => setActiveTabUrl(null));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Main menu shortcuts
      if (step === 'choose') {
        // S key - Create from screenshot
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          resetDraft();
          setStep('screenshot-method');
        }

        // N key - Create from scratch (New)
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          resetDraft();
          setStep('scratch');
        }
      }

      // Screenshot method screen shortcuts
      if (step === 'screenshot-method') {
        // S key - Select custom area
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          startSelectArea();
        }

        // F key - Capture full visible screen
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          startCaptureVisible();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [step, resetDraft]);

  const saveSettings = async () => {
    await browser.storage.local.set({
      papercuts_connect: connectCode,
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
      if (!parsed) {
        setError('Paste the Connect code from the web app first.');
        return;
      }
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
      if (!parsed) {
        setError('Paste the Connect code from the web app first.');
        return;
      }
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
        type: 'START_SELECTION_OPEN_COMPOSER',
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
      if (!parsed) {
        setError('Paste the Connect code from the web app first.');
        return;
      }
      await saveSettings();
      if (isRestrictedUrl(activeTabUrl ?? undefined)) {
        setError('Can’t capture on this page. Open any normal website tab and try again.');
        return;
      }
      const res = (await browser.runtime.sendMessage({
        type: 'CAPTURE_VISIBLE_OPEN_COMPOSER',
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
    <div className="w-[400px] p-5 bg-background">
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <div className="text-sm text-destructive mb-2">{error}</div>
          {error.toLowerCase().includes('refresh') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refreshCurrentTab}
              className="mt-2"
            >
              Refresh this tab
            </Button>
          )}
        </div>
      )}
      {step === 'choose' ? (
        <>
          <div className="title">Papercuts</div>
          <div className="sub">Create from scratch or from a screenshot.</div>

          <div className="field">
            <div className="label">Connect code</div>
            <input
              value={connectCode}
              onChange={(e) => {
                const v = e.target.value;
                setConnectCode(v);
                // persist immediately so it never “disappears”
                void browser.storage.local.set({ papercuts_connect: v });
              }}
              placeholder="Copy from web app → Extension API key → Connect code"
            />
          </div>

          {parsed ? (
            <div className="hint">Connected to: {baseUrl}</div>
          ) : (
            <div className="hint">Paste the connect code to enable capture + create.</div>
          )}

          <div className="tiles">
            <button
              type="button"
              className="tile"
              onClick={() => {
                resetDraft();
                setStep('screenshot-method');
              }}
            >
              <div className="tileTitle">
                <span>Create from screenshot</span>
                <kbd>S</kbd>
              </div>
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
              <div className="tileTitle">
                <span>Create from scratch</span>
                <kbd>N</kbd>
              </div>
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
                  <div className="tileTitle">Select area <span style={{ opacity: 0.5, fontSize: '0.875rem' }}>(S)</span></div>
                  <div className="tileDesc">Drag a rectangle on the current page.</div>
                </button>
                <button
                  type="button"
                  className="tile"
                  onClick={startCaptureVisible}
                  disabled={isSaving}
                >
                  <div className="tileTitle">Capture visible screen <span style={{ opacity: 0.5, fontSize: '0.875rem' }}>(F)</span></div>
                  <div className="tileDesc">Captures the current visible viewport.</div>
                </button>
              </div>
              <div className="hint">
                We’ll close this popup, start capture immediately, then open an extension form with the screenshot prefilled.
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
