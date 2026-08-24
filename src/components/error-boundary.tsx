import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router';

import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/error-message';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** When this value changes the boundary clears — used to reset on navigation. */
  resetKey?: string;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time crashes so one broken screen does not blank the whole app.
 *
 * This is for *unexpected* errors. Failed requests are not errors in this sense — TanStack
 * Query hands those back as `isError` and the screen renders its own state for them.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div role="alert" className="mx-auto max-w-md space-y-4 px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">This screen hit an error</h1>
        <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
        <Button onClick={this.reset}>Try again</Button>
      </div>
    );
  }
}

/**
 * Route-level boundary: resets itself when the user navigates, so a crashed screen does not
 * stay crashed after they click away and back.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
}
