import React from 'react';
import ReactDOM from 'react-dom/client';
import Composer from './Composer.tsx';
import '../popup/style.css';
import '../popup/App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Composer />
  </React.StrictMode>,
);


