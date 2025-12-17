import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [mode, setMode] = useState<'screenshot' | 'scratch'>('screenshot');
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');
  const [name, setName] = useState('New papercut');
  const [descriptionText, setDescriptionText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    browser.storage.local.get('papercuts_baseUrl').then((res) => {
      const v = res['papercuts_baseUrl'];
      if (typeof v === 'string' && v.trim()) setBaseUrl(v);
    });
  }, []);

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
    } finally {
      setIsSaving(false);
    }
  };

  const createFromScreenshot = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await browser.storage.local.set({ papercuts_baseUrl: baseUrl });
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) return;
      await browser.tabs.sendMessage(tab.id, {
        type: 'START_SELECTION',
        baseUrl,
        name: name.trim() || 'New papercut',
        descriptionText,
      });
      window.close();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="wrap">
      <div className="title">Papercuts</div>
      <div className="sub">Create from scratch or from a screenshot.</div>

      <div className="segmented" role="tablist" aria-label="Create mode">
        <button
          type="button"
          className={mode === 'scratch' ? 'seg active' : 'seg'}
          onClick={() => setMode('scratch')}
        >
          From scratch
        </button>
        <button
          type="button"
          className={mode === 'screenshot' ? 'seg active' : 'seg'}
          onClick={() => setMode('screenshot')}
        >
          From screenshot
        </button>
      </div>

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

      {mode === 'scratch' ? (
        <>
          <button className="primary" onClick={createFromScratch} disabled={isSaving}>
            {isSaving ? 'Creating…' : 'Create papercut'}
          </button>
          <div className="hint">Creates a papercut without a screenshot.</div>
        </>
      ) : (
        <>
          <button className="primary" onClick={createFromScreenshot} disabled={isSaving}>
            {isSaving ? 'Starting…' : 'Select area & create'}
          </button>
          <div className="hint">Tip: use Ctrl/⌘ + Shift + S</div>
        </>
      )}
    </div>
  );
}

export default App;
