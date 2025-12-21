import { useEffect, useMemo, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ResizableImage } from './ResizableImage';
import '../globals.css';
import './Composer.css';

type PapercutModule = 'CoreHR' | 'Recruit' | 'Perform' | 'Pulse' | 'Time' | 'Desk';
const PAPERCUT_MODULES: PapercutModule[] = ['CoreHR', 'Recruit', 'Perform', 'Pulse', 'Time', 'Desk'];

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
  const [nameError, setNameError] = useState<string | null>(null);
  const [module, setModule] = useState<PapercutModule | ''>('');
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenshotBytes, setScreenshotBytes] = useState<Uint8Array | null>(null);
  const [screenshotInjected, setScreenshotInjected] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      ResizableImage.configure({
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
    editable: true,
  });

  // Add handler for custom image preview event
  useEffect(() => {
    if (!editor) return;

    const handleImagePreview = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.src) {
        setPreviewImage(customEvent.detail.src);
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener('image-preview', handleImagePreview);

    return () => {
      editorElement.removeEventListener('image-preview', handleImagePreview);
    };
  }, [editor]);

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
    setNameError(null);
    setModuleError(null);

    if (!parsed) {
      setError('Paste the Connect code from the web app first.');
      return;
    }
    if (!name.trim()) {
      setNameError('Name is required.');
      return;
    }
    if (!module) {
      setModuleError('Module is required.');
      return;
    }
    setIsSaving(true);
    try {
      let uploadedUrl: string | null = null;

      // Upload screenshot if we have one
      if (screenshotBytes) {
        console.log('[Papercuts] Starting screenshot upload...');
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

        console.log('[Papercuts] Upload response status:', uploadRes.status);

        if (!uploadRes.ok) {
          const errorText = await uploadRes.text();
          console.error('[Papercuts] Upload failed:', errorText);
          setError('Screenshot upload failed. Check your connection and try again.');
          return;
        }

        const uploadJson = (await uploadRes.json()) as { url: string };
        uploadedUrl = uploadJson.url;
        console.log('[Papercuts] Screenshot uploaded:', uploadedUrl);
      }

      // Get HTML from TipTap editor and replace data URL with uploaded URL
      let descriptionHtml = editor?.getHTML() ?? '';
      console.log('[Papercuts] FULL Original descriptionHtml:', descriptionHtml);

      // Count how many images are in the HTML
      const imgCount = (descriptionHtml.match(/<img/g) || []).length;
      console.log('[Papercuts] Number of <img> tags in original HTML:', imgCount);

      if (uploadedUrl && descriptionHtml) {
        // Replace data URL screenshot with uploaded URL
        descriptionHtml = descriptionHtml.replace(
          /<img[^>]+src="data:image\/png;base64,[^"]+"[^>]*>/g,
          `<img src="${uploadedUrl}" alt="Screenshot" />`
        );
        const imgCountAfter = (descriptionHtml.match(/<img/g) || []).length;
        console.log('[Papercuts] Number of <img> tags after replacement:', imgCountAfter);
        console.log('[Papercuts] FULL After replacement descriptionHtml:', descriptionHtml);
      }

      console.log('[Papercuts] Creating papercut...');
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
          module: module || null,
        }),
      });

      console.log('[Papercuts] Create response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Papercuts] Create failed:', errorText);
        setError('Create failed. Check your Connect code and try again.');
        return;
      }

      // Clean up stored screenshot
      await browser.storage.local.remove(['pending_screenshot_bytes']);
      if (screenshotKey) {
        await browser.storage.session.remove([screenshotKey]);
      }

      console.log('[Papercuts] Papercut created successfully');
      setDone(true);
      // TEMPORARILY: Don't close tab so we can see console logs
      // setTimeout(() => window.close(), 350);
    } catch (err) {
      console.error('[Papercuts] Error creating papercut:', err);
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
    <div className="min-h-screen bg-background p-8 pb-24">
      <div className="w-[1000px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">New papercut</h1>
          {parsed ? (
            <p className="text-sm text-muted-foreground mt-1">Connected to: {baseUrl}</p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">Not connected yet.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError && e.target.value.trim()) {
                setNameError(null);
              }
            }}
            onBlur={() => {
              if (!name.trim()) {
                setNameError('Name is required.');
              }
            }}
            placeholder="What's the papercut?"
            className={nameError ? 'border-destructive' : ''}
          />
          {nameError && (
            <p className="text-sm text-destructive">{nameError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="module">Module *</Label>
          <select
            id="module"
            value={module}
            onChange={(e) => {
              setModule(e.target.value as PapercutModule | '');
              if (moduleError && e.target.value) {
                setModuleError(null);
              }
            }}
            onBlur={() => {
              if (!module) {
                setModuleError('Module is required.');
              }
            }}
            className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${moduleError ? 'border-destructive' : ''}`}
          >
            <option value="">Select a module</option>
            {PAPERCUT_MODULES.map((mod) => (
              <option key={mod} value={mod}>
                {mod}
              </option>
            ))}
          </select>
          {moduleError && (
            <p className="text-sm text-destructive">{moduleError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description with screenshot</Label>
          <EditorContent editor={editor} />
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
      </div>

      {/* Sticky bottom panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="w-[1000px] mx-auto px-8 py-4 flex gap-3 justify-between items-center">
          <Button type="button" variant="outline" onClick={() => window.close()} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={create} disabled={isSaving || !parsed}>
            {isSaving ? 'Creating…' : 'Create papercut'}
          </Button>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
