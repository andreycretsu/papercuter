import { useEffect, useMemo, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
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

export default function Composer() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const screenshotKey = params.get('screenshotKey') ?? '';
  const sourceTabId = params.get('sourceTabId') ?? '';

  const [connectCode, setConnectCode] = useState('');
  const parsed = useMemo(() => parseConnectCode(connectCode), [connectCode]);
  const baseUrl = parsed?.baseUrl ?? '';
  const apiKey = parsed?.apiKey ?? '';

  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenshotBytes, setScreenshotBytes] = useState<Uint8Array | null>(null);
  const [screenshotInjected, setScreenshotInjected] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: 'Add a description...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
  });

  useEffect(() => {
    browser.storage.local.get(['papercuts_connect', 'pending_screenshot_bytes']).then((res) => {
      const c = res['papercuts_connect'];
      if (typeof c === 'string') setConnectCode(c);

      const bytes = res['pending_screenshot_bytes'];
      if (Array.isArray(bytes)) {
        const uint8 = new Uint8Array(bytes);
        setScreenshotBytes(uint8);

        // Convert to data URL and inject into editor
        const blob = new Blob([uint8], { type: 'image/png' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          // Inject screenshot into TipTap editor
          if (editor && !screenshotInjected) {
            editor.commands.setContent(`<img src="${dataUrl}" alt="Screenshot" />`);
            setScreenshotInjected(true);
          }
        };
        reader.readAsDataURL(blob);
      }
    });

    // Also try to get from session storage if available
    if (screenshotKey) {
      browser.storage.session.get([screenshotKey]).then((res) => {
        const dataUrl = res[screenshotKey];
        if (typeof dataUrl === 'string' && editor && !screenshotInjected) {
          editor.commands.setContent(`<img src="${dataUrl}" alt="Screenshot" />`);
          setScreenshotInjected(true);
        }
      });
    }
  }, [screenshotKey, editor, screenshotInjected]);

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
      let uploadedUrl: string | null = null;

      // Upload screenshot if we have one
      if (screenshotBytes) {
        const imageBlob = new Blob([screenshotBytes], { type: 'image/png' });
        const form = new FormData();
        form.set('file', imageBlob, 'papercut.png');

        const uploadRes = await fetch(`${baseUrl}/api/uploads`, {
          method: 'POST',
          headers: {
            'x-papercuts-key': apiKey,
          },
          body: form,
        });

        if (!uploadRes.ok) {
          setError('Screenshot upload failed. Check your connection and try again.');
          return;
        }

        const uploadJson = (await uploadRes.json()) as { url: string };
        uploadedUrl = uploadJson.url;
      }

      // Get HTML from TipTap editor and replace data URL with uploaded URL
      let descriptionHtml = editor?.getHTML() ?? '';
      if (uploadedUrl && descriptionHtml) {
        // Replace data URL screenshot with uploaded URL
        descriptionHtml = descriptionHtml.replace(
          /<img[^>]+src="data:image\/png;base64,[^"]+"[^>]*>/g,
          `<img src="${uploadedUrl}" alt="Screenshot" />`
        );
      }

      const res = await fetch(`${baseUrl}/api/papercuts`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-papercuts-key': apiKey,
        },
        body: JSON.stringify({
          name: name.trim(),
          descriptionHtml,
          screenshotUrl: uploadedUrl,
        }),
      });

      if (!res.ok) {
        setError('Create failed. Check your Connect code and try again.');
        return;
      }

      // Clean up stored screenshot
      await browser.storage.local.remove(['pending_screenshot_bytes']);
      if (screenshotKey) {
        await browser.storage.session.remove([screenshotKey]);
      }

      setDone(true);
      // Close tab after a moment
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
      setError('Cannot retake: missing tab context. Start capture again from the extension.');
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
    <div className="wrap composer composer-fullpage">
      <div className="title">New papercut</div>

      <div className="field">
        <div className="label">Connect code</div>
        <input
          value={connectCode}
          onChange={(e) => onChangeConnect(e.target.value)}
          placeholder="Paste Connect code from the web app"
        />
      </div>

      {parsed ? <div className="hint">Connected to: {baseUrl}</div> : <div className="hint">Not connected yet.</div>}

      <div className="field">
        <div className="label">Name</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="What's the papercut?" />
      </div>

      <div className="field">
        <div className="label">Description with screenshot</div>
        <EditorContent editor={editor} />
        {screenshotBytes && (
          <button type="button" className="btn retake-btn" onClick={retake} disabled={isSaving}>
            Retake screenshot
          </button>
        )}
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
