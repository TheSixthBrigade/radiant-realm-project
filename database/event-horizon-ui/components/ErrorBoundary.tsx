"use client";

import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-full bg-[#0d0d0d] flex items-center justify-center">
                    <div className="max-w-md w-full text-center space-y-6 p-8">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <span className="text-2xl">⚠</span>
                        </div>
                        <h2 className="text-xl font-bold text-[#ededed]">Something went wrong</h2>
                        <p className="text-sm text-gray-500">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <div className="flex gap-3 justify-center pt-4">
                            <button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                className="px-6 py-2.5 rounded-lg bg-[#3ecf8e] text-black text-xs font-bold uppercase tracking-widest hover:bg-[#34b27b] transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => { window.location.href = '/login'; }}
                                className="px-6 py-2.5 rounded-lg bg-[#141414] border border-[#262626] text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-white hover:border-gray-500 transition-colors"
                            >
                                Go to Login
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
