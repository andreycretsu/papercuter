import React from 'react';
import ReactDOM from 'react-dom/client';
import ScreenshotPreview from './ScreenshotPreview';
import '../popup/style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ScreenshotPreview />
  </React.StrictMode>
);
