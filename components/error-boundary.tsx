'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In a real application, you would log this to an error reporting service.
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI.
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <p className="text-muted-foreground">
            An unexpected error occurred. We&apos;ve logged the issue and will look into it.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;