"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                Something went wrong
              </h1>
              <p className="text-gray-700 mb-4">
                The dashboard encountered an error. Please try refreshing the page.
              </p>
              {this.state.error && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm text-gray-600 mb-2">
                    Error Details
                  </summary>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
              <button
                onClick={() => {
                  window.location.href = "/dashboard";
                }}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Reload Dashboard
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/login";
                }}
                className="w-full mt-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Clear Data & Login
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

