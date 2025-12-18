import { useState, useEffect, useRef } from 'react';
import './ScreenshotPreview.css';

export default function ScreenshotPreview() {
  const params = new URLSearchParams(window.location.search);
  const screenshotKey = params.get('screenshotKey') ?? '';

  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#ff0000');
  const [drawWidth, setDrawWidth] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Load screenshot from storage
    if (screenshotKey) {
      browser.storage.session.get([screenshotKey]).then((res) => {
        const dataUrl = res[screenshotKey];
        if (typeof dataUrl === 'string') {
          setScreenshotDataUrl(dataUrl);
        }
      });
    } else {
      browser.storage.local.get(['pending_screenshot_bytes']).then((res) => {
        const bytes = res['pending_screenshot_bytes'];
        if (Array.isArray(bytes)) {
          const uint8 = new Uint8Array(bytes);
          const blob = new Blob([uint8], { type: 'image/png' });
          const reader = new FileReader();
          reader.onloadend = () => setScreenshotDataUrl(reader.result as string);
          reader.readAsDataURL(blob);
        }
      });
    }
  }, [screenshotKey]);

  useEffect(() => {
    if (screenshotDataUrl && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
        setCtx(context);
      };
      img.src = screenshotDataUrl;
    }
  }, [screenshotDataUrl]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setLastPoint({ x, y });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx || !lastPoint) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    setLastPoint({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  const handleConfirm = async () => {
    if (!canvasRef.current) return;

    // Convert edited canvas to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvasRef.current!.toBlob((b) => resolve(b!), 'image/png');
    });

    // Convert to array buffer
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Convert to data URL for preview
    const dataUrl = canvasRef.current.toDataURL('image/png');

    // Store edited screenshot
    await browser.storage.local.set({
      pending_screenshot_bytes: Array.from(uint8Array)
    });

    // Update session storage if key exists
    if (screenshotKey) {
      await browser.storage.session.set({ [screenshotKey]: dataUrl });
    }

    // Open composer
    const urlParams = new URLSearchParams(window.location.search);
    const composerUrl = browser.runtime.getURL('composer.html');
    const url = new URL(composerUrl);
    urlParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    await browser.tabs.create({ url: url.toString(), active: true });
    window.close();
  };

  const handleRetake = () => {
    window.close();
    // The user will need to start the capture flow again
  };

  return (
    <div className="screenshot-preview">
      <div className="preview-header">
        <h1>Review & Annotate Screenshot</h1>
        <p>Draw on the screenshot to highlight important areas, then confirm or retake.</p>
      </div>

      <div className="drawing-tools">
        <label>
          Color:
          <input
            type="color"
            value={drawColor}
            onChange={(e) => setDrawColor(e.target.value)}
          />
        </label>
        <label>
          Pen Size:
          <input
            type="range"
            min="1"
            max="10"
            value={drawWidth}
            onChange={(e) => setDrawWidth(Number(e.target.value))}
          />
          <span>{drawWidth}px</span>
        </label>
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (ctx && screenshotDataUrl) {
              const img = new Image();
              img.onload = () => {
                ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
                ctx.drawImage(img, 0, 0);
              };
              img.src = screenshotDataUrl;
            }
          }}
        >
          Clear Annotations
        </button>
      </div>

      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>

      <div className="preview-actions">
        <button type="button" className="btn btn-secondary" onClick={handleRetake}>
          Retake Screenshot
        </button>
        <button type="button" className="btn btn-primary" onClick={handleConfirm}>
          Confirm & Continue
        </button>
      </div>
    </div>
  );
}
