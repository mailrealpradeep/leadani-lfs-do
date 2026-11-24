import { cn } from "@/lib/utils";

/**
 * Leadani brand mark (from /logo/leadani logo square.png, resized into
 * client/public/brand). The source PNG has its own dark rounded tile, so it is
 * clipped to a matching radius and slightly scaled to hide the square corners.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-block shrink-0 overflow-hidden rounded-[24%] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_24px_-8px_rgba(99,102,241,0.6)]",
        className ?? "h-8 w-8",
      )}
    >
      <img
        src="/brand/leadani-icon.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-full w-full scale-[1.06] object-cover"
      />
    </span>
  );
}

export function BrandLogo({
  className,
  markClassName,
  textClassName,
}: {
  className?: string;
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} aria-label="Leadani">
      <BrandMark className={markClassName} />
      <span
        className={cn(
          "font-[Geist,Inter,sans-serif] text-[19px] font-semibold leading-none tracking-[-0.02em]",
          textClassName,
        )}
      >
        Leadani
      </span>
    </span>
  );
}
