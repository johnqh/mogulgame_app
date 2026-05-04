import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { textVariants, buttonVariant, designTokens } from '@sudobility/design';
import { analyticsService } from '../config/analytics';

interface ErrorBoundaryProps {
  /** Content to render when no error has occurred. */
  children: ReactNode;
  /** Optional custom fallback UI to display when an error is caught. */
  fallback?: ReactNode;
  /** Optional callback invoked when an error is caught. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component that catches JavaScript errors in its child
 * component tree and displays a fallback UI instead of crashing the
 * entire application.
 *
 * Use at the route level to isolate page errors, or at the application
 * root as a last-resort catch-all.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    analyticsService.trackError(error.message, error.name);
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div role="alert" className="min-h-[400px] flex flex-col items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h2 className={`${textVariants.heading.h4()} mb-2`}>Something went wrong</h2>
            <p className={`${textVariants.body.md()} mb-4`}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={this.handleRetry}
              className={`${buttonVariant('primary')} ${designTokens.radius.lg} text-sm`}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
