import React, { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-red-950 text-red-200 font-mono p-10">
          <div className="max-w-2xl border border-red-800 p-8 bg-black rounded">
            <h1 className="text-2xl font-bold mb-4">CRITICAL SYSTEM FAILURE</h1>
            <p className="mb-4">The Red Pill Charting Engine encountered an unrecoverable error.</p>
            <pre className="bg-red-900/20 p-4 rounded text-sm overflow-auto max-h-60 border border-red-900/50">
              {this.state.error?.toString()}
            </pre>
            <button 
                onClick={() => window.location.reload()}
                className="mt-6 px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded font-bold transition-colors"
            >
                REBOOT SYSTEM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}