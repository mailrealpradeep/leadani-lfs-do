import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Check mobile status synchronously for initial render
function checkIsMobile(): boolean {
  if (typeof window === "undefined") return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile() {
  // Initialize with actual value to prevent layout flash
  const [isMobile, setIsMobile] = React.useState<boolean>(() => checkIsMobile())

  React.useLayoutEffect(() => {
    // SSR safety: guard against missing window
    if (typeof window === "undefined") return

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Re-check on mount in case initial check was wrong
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
