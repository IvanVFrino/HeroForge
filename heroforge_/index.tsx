
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CharacterProvider } from './context/CharacterContext';
import { HeroForgeProvider } from './context/HeroForgeDataContext';
import { HashRouter } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <HeroForgeProvider>
        <CharacterProvider> {/* Manages the character actively being created/edited */}
          <App /> {/* Main HeroForge application shell */}
        </CharacterProvider>
      </HeroForgeProvider>
    </HashRouter>
  </React.StrictMode>
);