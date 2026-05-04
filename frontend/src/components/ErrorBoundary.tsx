import React, { Component, ReactNode } from 'react';
import { logToStorage } from '../hooks/useErrorLog';

interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    logToStorage(
      'error',
      'ErrorBoundary',
      error.message || 'Unhandled React render error',
      (error.stack ?? '') + '\n\nComponent stack:\n' + info.componentStack,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-sm text-red-600 dark:text-red-400">
          <p className="font-semibold mb-1">⚠️ Something went wrong</p>
          <p className="text-xs opacity-80">{this.state.error?.message}</p>
          <p className="text-[10px] mt-2 opacity-60">This error has been captured in the Error Log panel.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
