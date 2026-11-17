import { StrictMode } from 'react';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { createRoot } from 'react-dom/client';


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter><App /></HashRouter>
  </StrictMode>
);
