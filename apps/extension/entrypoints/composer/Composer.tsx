import { useEffect, useMemo, useState } from 'react';
import './Composer.css';

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

function escapeHtml(text: string) {
  return (text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function textToHtml(text: string) {
  const escaped = escapeHtml(text);
  return `<p>${escaped.replaceAll('\n', '<br/>')}</p>`;
}

function imageAndTextToHtml(imageUrl: string, text: string) {
  const img = `<p><img src="${imageUrl}" alt="Screenshot" /></p>`;
  const rest = (text ?? '').trim() ? textToHtml(text) : '';
  return `${img}${rest}`;
}

export default function Composer() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const screenshotUrl = params.get('screenshotUrl') ?? '';
  const sourceTabId = params.get('sourceTabId') ?? '';

  const [connectCode, setConnectCode] = useState('');
  const parsed = useMemo(() => parseConnectCode(connectCode), [connectCode]);
  const baseUrl = parsed?.baseUrl ?? '';
  const apiKey = parsed?.apiKey ?? '';

  const [name, setName] = useState('New papercut');
  const [descriptionText, setDescriptionText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    browser.storage.local.get(['papercuts_connect']).then((res) => {
      const c = res['papercuts_connect'];
      if (typeof c === 'string') setConnectCode(c);
    });
  }, []);

  const onChangeConnect = (v: string) => {
    setConnectCode(v);
    void browser.storage.local.set({ papercuts_connect: v });
  };

  const create = async () => {
    setError(null);
    if (!parsed) {
      setError('Paste the Connect code from the web app first.');
      return;
    }
    if (!name.trim()) {
      setError('Add a name.');
      return;
    }
    setIsSaving(true);
    try {
      const descriptionHtml = screenshotUrl
        ? imageAndTextToHtml(screenshotUrl, descriptionText)
        : textToHtml(descriptionText);

      const res = await fetch(`${baseUrl}/api/papercuts`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-papercuts-key': apiKey,
        },
        body: JSON.stringify({
          name: name.trim(),
          descriptionHtml,
          screenshotUrl: screenshotUrl || null,
        }),
      });

      if (!res.ok) {
        setError('Create failed. Check your Connect code and try again.');
        return;
      }

      setDone(true);
      // Close window quickly to feel instant.
      setTimeout(() => window.close(), 350);
    } catch {
      setError('Create failed. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const retake = async () => {
    setError(null);
    if (!sourceTabId) {
      setError('Can’t retake: missing tab context. Start capture again from the extension.');
      return;
    }
    try {
      await browser.runtime.sendMessage({
        type: 'RETARGET_RETAKE_SELECTION',
        tabId: Number(sourceTabId),
      });
      window.close();
    } catch {
      setError('Retake failed. Try again.');
    }
  };

  return (
    <div className="wrap composer">
      <div className="title">New papercut</div>
      <div className="sub">
        {screenshotUrl ? 'Screenshot captured — add a name + a bit of context.' : 'Add a name + description.'}
      </div>

      <div className="field">
        <div className="label">Connect code</div>
        <input
          value={connectCode}
          onChange={(e) => onChangeConnect(e.target.value)}
          placeholder="Paste Connect code from the web app"
        />
      </div>

      {parsed ? <div className="hint">Connected to: {baseUrl}</div> : <div className="hint">Not connected yet.</div>}

      {screenshotUrl ? (
        <div className="preview">
          <img className="previewImg" src={screenshotUrl} alt="Screenshot preview" />
          <div className="previewActions">
            <button type="button" className="btn" onClick={retake} disabled={isSaving}>
              Retake
            </button>
          </div>
        </div>
      ) : null}

      <div className="field">
        <div className="label">Name</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="What’s the papercut?" />
      </div>

      <div className="field">
        <div className="label">Description</div>
        <textarea
          value={descriptionText}
          onChange={(e) => setDescriptionText(e.target.value)}
          placeholder="Add a short note…"
          rows={6}
        />
      </div>

      {error ? <div className="error">{error}</div> : null}
      {done ? <div className="ok">Created ✓</div> : null}

      <div className="actions">
        <button type="button" className="btn" onClick={() => window.close()} disabled={isSaving}>
          Cancel
        </button>
        <button type="button" className="btnPrimary" onClick={create} disabled={isSaving}>
          {isSaving ? 'Creating…' : 'Create papercut'}
        </button>
      </div>
    </div>
  );
}


