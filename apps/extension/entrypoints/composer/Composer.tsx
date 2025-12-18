import { useEffect, useMemo, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import '../globals.css';
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

  // Load connect code and screenshot bytes on mount
  useEffect(() => {
    browser.storage.local.get(['papercuts_connect', 'pending_screenshot_bytes']).then((res) => {
      const c = res['papercuts_connect'];
      if (typeof c === 'string') setConnectCode(c);

      const bytes = res['pending_screenshot_bytes'];
      if (Array.isArray(bytes)) {
        const uint8 = new Uint8Array(bytes);
        setScreenshotBytes(uint8);
      }
    });
  }, []);

  // Inject screenshot into editor when both editor and bytes are ready
  useEffect(() => {
    if (!editor || !screenshotBytes || screenshotInjected) return;

    const blob = new Blob([screenshotBytes], { type: 'image/png' });
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      editor.commands.setContent(`<img src="${dataUrl}" alt="Screenshot" />`);
      setScreenshotInjected(true);
    };
    reader.readAsDataURL(blob);
  }, [editor, screenshotBytes, screenshotInjected]);

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

  const deleteScreenshot = async () => {
    setError(null);
    // Clear screenshot from storage
    await browser.storage.local.remove(['pending_screenshot_bytes']);
    if (screenshotKey) {
      await browser.storage.session.remove([screenshotKey]);
    }
    // Reset state
    setScreenshotBytes(null);
    setScreenshotInjected(false);
    // Clear editor content
    if (editor) {
      editor.commands.setContent('');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">New papercut</h1>
        </div>

        <div className="space-y-2">
          <Label htmlFor="connect-code">Connect code</Label>
          <Input
            id="connect-code"
            value={connectCode}
            onChange={(e) => onChangeConnect(e.target.value)}
            placeholder="Paste Connect code from the web app"
          />
          {parsed ? (
            <p className="text-sm text-muted-foreground">Connected to: {baseUrl}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Not connected yet.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What's the papercut?"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description with screenshot</Label>
          <EditorContent editor={editor} />
          {screenshotBytes && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={deleteScreenshot}
              disabled={isSaving}
              className="mt-3"
            >
              Delete screenshot
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {done && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            Created ✓
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => window.close()} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={create} disabled={isSaving}>
            {isSaving ? 'Creating…' : 'Create papercut'}
          </Button>
        </div>
      </div>
    </div>
  );
}
