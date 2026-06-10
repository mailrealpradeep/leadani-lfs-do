import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface LazyRouteErrorBoundaryProps {
  children: ReactNode;
}

interface LazyRouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function isChunkLoadError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("loading chunk") ||
    message.includes("importing a module script failed")
  );
}

export class LazyRouteErrorBoundary extends Component<
  LazyRouteErrorBoundaryProps,
  LazyRouteErrorBoundaryState
> {
  state: LazyRouteErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): LazyRouteErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[LazyRouteErrorBoundary]", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children;
    }

    const chunkError = isChunkLoadError(this.state.error);

    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h2 className="text-lg font-semibold">
          {chunkError ? "Page failed to load" : "Something went wrong"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {chunkError
            ? "This can happen after an app update or on a slow connection. Try again or refresh the page."
            : this.state.error.message || "An unexpected error occurred."}
        </p>
        <div className="flex gap-2">
          <Button onClick={this.handleRetry} variant="default">
            Try again
          </Button>
          <Button onClick={this.handleReload} variant="outline">
            Refresh page
          </Button>
        </div>
      </div>
    );
  }
}
