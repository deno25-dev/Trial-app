import React, { useState, useEffect } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { ChartProvider } from './context/ChartContext';
import { DeveloperTools } from './components/DeveloperTools';
import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

  // Mandate 0.6.1: Ctrl + D for Developer Tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        setIsDevToolsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ErrorBoundary>
      <ChartProvider>
        <div className="h-screen w-screen bg-background text-text flex flex-col font-mono overflow-hidden">
          <MainLayout />
          {isDevToolsOpen && <DeveloperTools onClose={() => setIsDevToolsOpen(false)} />}
        </div>
      </ChartProvider>
    </ErrorBoundary>
  );
};

export default App;