import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="shell">
      <section className="placeholder">
        <span>locaOS / NAVI</span>
        <h1>Experiment surface ready.</h1>
        <p>This branch is a disposable Blink UX laboratory. Build the NAVI contextual workspace here.</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
