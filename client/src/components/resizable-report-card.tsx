import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { GripVertical, GripHorizontal, Maximize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResizableReportCardProps {
  reportId: string;
  children: React.ReactNode;
  className?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

const STORAGE_KEY = "report-card-dimensions";
const MOBILE_BREAKPOINT = 768;

interface StoredDimensions {
  [reportId: string]: { width: number | null; height: number | null };
}

function getStoredDimensions(): StoredDimensions {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredDimensions(reportId: string, width: number | null, height: number | null) {
  try {
    const stored = getStoredDimensions();
    stored[reportId] = { width, height };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Ignore storage errors
  }
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function ResizableReportCard({
  reportId,
  children,
  className = "",
  defaultWidth = 500,
  defaultHeight = 450,
  minWidth = 350,
  minHeight = 300,
  maxWidth = 1200,
  maxHeight = 900,
}: ResizableReportCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState<"width" | "height" | "both" | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number | null; height: number | null }>({
    width: null,
    height: null,
  });
  const [isMobileView, setIsMobileView] = useState(isMobile());
  const startPos = useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });
  const pendingDimensions = useRef<{ width: number | null; height: number | null }>({ width: null, height: null });

  // Handle responsive behavior on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(isMobile());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load stored dimensions
  useEffect(() => {
    const stored = getStoredDimensions()[reportId];
    if (stored) {
      // Clamp height to viewport height (minus some padding)
      const maxViewportHeight = typeof window !== "undefined" ? window.innerHeight - 100 : maxHeight;
      const clampedHeight = stored.height ? Math.min(stored.height, maxViewportHeight) : null;
      setDimensions({ 
        width: stored.width, 
        height: clampedHeight 
      });
    }
  }, [reportId, maxHeight]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, direction: "width" | "height" | "both") => {
      e.preventDefault();
      e.stopPropagation();
      
      if (isMobileView) return; // Disable resizing on mobile
      
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      startPos.current = {
        x: e.clientX,
        y: e.clientY,
        width: dimensions.width ?? rect.width,
        height: dimensions.height ?? rect.height,
      };
      pendingDimensions.current = { ...dimensions };
      setIsResizing(direction);
    },
    [dimensions, isMobileView]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;

      let newWidth = startPos.current.width;
      let newHeight = startPos.current.height;

      if (isResizing === "width" || isResizing === "both") {
        newWidth = Math.max(minWidth, Math.min(maxWidth, startPos.current.width + deltaX));
      }
      if (isResizing === "height" || isResizing === "both") {
        newHeight = Math.max(minHeight, Math.min(maxHeight, startPos.current.height + deltaY));
      }

      pendingDimensions.current = { width: newWidth, height: newHeight };
      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      // Persist dimensions on mouse up
      const { width, height } = pendingDimensions.current;
      if (width !== null || height !== null) {
        setStoredDimensions(reportId, width, height);
      }
      setIsResizing(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = isResizing === "width" ? "ew-resize" : isResizing === "height" ? "ns-resize" : "nwse-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, reportId, minWidth, minHeight, maxWidth, maxHeight]);

  const handleReset = useCallback(() => {
    setDimensions({ width: null, height: null });
    setStoredDimensions(reportId, null, null);
  }, [reportId]);

  const handleExpand = useCallback(() => {
    setDimensions({ width: maxWidth, height: maxHeight });
    setStoredDimensions(reportId, maxWidth, maxHeight);
  }, [reportId, maxWidth, maxHeight]);

  const hasCustomSize = dimensions.width !== null || dimensions.height !== null;

  // On mobile, use full width and auto height
  if (isMobileView) {
    return (
      <div 
        ref={containerRef}
        className={`w-full ${className}`}
        data-testid={`resizable-report-${reportId}`}
      >
        <Card className="w-full overflow-hidden flex flex-col" style={{ minHeight: minHeight }}>
          {children}
        </Card>
      </div>
    );
  }

  // Calculate actual width - use default or stored dimensions
  const actualWidth = dimensions.width ?? defaultWidth;
  const actualHeight = dimensions.height ?? defaultHeight;

  return (
    <div
      ref={containerRef}
      className={`relative group ${className}`}
      style={{
        width: actualWidth,
        height: actualHeight,
        maxWidth: "100%",
        transition: isResizing ? "none" : "width 0.2s, height 0.2s",
      }}
      data-testid={`resizable-report-${reportId}`}
    >
        <Card className="w-full h-full overflow-hidden flex flex-col">
          {children}
        </Card>

        {/* Quick action buttons - top right */}
        <div className="absolute top-2 right-12 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 bg-background/80 backdrop-blur-sm"
            onClick={handleExpand}
            title="Expand to max size"
            data-testid={`button-expand-report-${reportId}`}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          {hasCustomSize && (
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 bg-background/80 backdrop-blur-sm"
              onClick={handleReset}
              title="Reset to default size"
              data-testid={`button-reset-report-${reportId}`}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Right edge resize handle (width) */}
        <div
          className="absolute top-1/2 -right-1 -translate-y-1/2 w-3 h-12 flex items-center justify-center cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-primary/10 rounded"
          onMouseDown={(e) => handleMouseDown(e, "width")}
          title="Drag to resize width"
          data-testid={`handle-width-report-${reportId}`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Bottom edge resize handle (height) */}
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-3 w-12 flex items-center justify-center cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-primary/10 rounded"
          onMouseDown={(e) => handleMouseDown(e, "height")}
          title="Drag to resize height"
          data-testid={`handle-height-report-${reportId}`}
        >
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Corner resize handle (both) */}
        <div
          className="absolute -bottom-1 -right-1 w-4 h-4 flex items-center justify-center cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-primary/10 rounded"
          onMouseDown={(e) => handleMouseDown(e, "both")}
          title="Drag to resize"
          data-testid={`handle-corner-report-${reportId}`}
        >
          <div className="w-2 h-2 border-r-2 border-b-2 border-muted-foreground" />
        </div>

        {/* Size indicator when resizing */}
        {isResizing && (
          <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm text-xs px-2 py-1 rounded border shadow-sm z-30">
            {Math.round(dimensions.width || 0)} × {Math.round(dimensions.height || 0)}
          </div>
        )}
    </div>
  );
}
