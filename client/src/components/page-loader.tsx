interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label = "Loading page..." }: PageLoaderProps) {
  return (
    <div
      className="min-h-[50vh] flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
