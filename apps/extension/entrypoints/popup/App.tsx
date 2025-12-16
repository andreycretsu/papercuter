import { useEffect, useState } from 'react';
import './App.css';

function App() {
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

  const capture = async () => {
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
      <div className="sub">Select an area and create a new papercut.</div>

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

      <button className="primary" onClick={capture} disabled={isSaving}>
        {isSaving ? 'Starting…' : 'Capture selected area'}
      </button>

      <div className="hint">Tip: use Ctrl/⌘ + Shift + S</div>
    </div>
  );
}

export default App;
