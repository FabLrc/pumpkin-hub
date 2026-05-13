"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class StudioErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Studio editor error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-full bg-[#0f0f1a] p-8">
          <p className="text-sm text-red-400 mb-2">Une erreur est survenue dans l&apos;éditeur</p>
          <p className="text-xs text-[#888] mb-4 max-w-md text-center">
            {this.state.error?.message || "Erreur inconnue"}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-3 py-1.5 text-xs text-white bg-[#f97316] hover:bg-[#ea580c] transition-colors"
          >
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
