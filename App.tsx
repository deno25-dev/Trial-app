import React, { useState, useEffect } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { ChartProvider } from './context/ChartContext';
import { DeveloperTools } from './components/DeveloperTools';
import { ErrorBoundary } from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Initialize the Query Client for managing UI state and server caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // Data is fresh for 1 minute
      gcTime: 1000 * 60 * 5, // Garbage collect after 5 minutes
      retry: 1,
    },
  },
});

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
      <QueryClientProvider client={queryClient}>
        <ChartProvider>
          {/* Removed font-mono from here to allow Inter to shine in UI elements */}
          <div className="h-screen w-screen bg-background text-text flex flex-col overflow-hidden">
            <MainLayout />
            {isDevToolsOpen && <DeveloperTools onClose={() => setIsDevToolsOpen(false)} />}
          </div>
        </ChartProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;