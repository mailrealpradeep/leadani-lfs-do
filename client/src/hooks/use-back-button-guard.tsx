import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useIsMobile } from "./use-mobile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const NAV_DEPTH_KEY = "lfs-nav-depth";
const GUARD_INSTALLED_KEY = "lfs-guard-installed";
const GUARD_STATE_KEY = "lfs-exit-guard";

export function useBackButtonGuard() {
  const isMobile = useIsMobile();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [location] = useLocation();
  const prevLocationRef = useRef<string | null>(null);
  const isExitingRef = useRef(false);

  const getNavDepth = useCallback((): number => {
    try {
      const stored = sessionStorage.getItem(NAV_DEPTH_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  }, []);

  const setNavDepth = useCallback((depth: number) => {
    try {
      sessionStorage.setItem(NAV_DEPTH_KEY, String(Math.max(0, depth)));
    } catch {
    }
  }, []);

  const isGuardInstalled = useCallback((): boolean => {
    try {
      return sessionStorage.getItem(GUARD_INSTALLED_KEY) === "true";
    } catch {
      return false;
    }
  }, []);

  const setGuardInstalled = useCallback((value: boolean) => {
    try {
      if (value) {
        sessionStorage.setItem(GUARD_INSTALLED_KEY, "true");
      } else {
        sessionStorage.removeItem(GUARD_INSTALLED_KEY);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isMobile) return;
    if (isGuardInstalled()) return;
    
    setNavDepth(1);
    setGuardInstalled(true);
    
    const currentUrl = window.location.href;
    const existingState = window.history.state || {};
    
    window.history.replaceState(
      { ...existingState, [GUARD_STATE_KEY]: true, depth: 0 }, 
      ""
    );
    window.history.pushState(
      { ...existingState, depth: 1 }, 
      "", 
      currentUrl
    );
  }, [isMobile, setNavDepth, isGuardInstalled, setGuardInstalled]);

  useEffect(() => {
    if (typeof window === "undefined" || !isMobile) return;
    
    if (prevLocationRef.current === null) {
      prevLocationRef.current = location;
      return;
    }
    
    if (prevLocationRef.current !== location) {
      const newDepth = getNavDepth() + 1;
      setNavDepth(newDepth);
      
      const currentState = window.history.state || {};
      window.history.replaceState({ ...currentState, depth: newDepth }, "");
      
      prevLocationRef.current = location;
    }
  }, [location, isMobile, getNavDepth, setNavDepth]);

  const handlePopState = useCallback((event: PopStateEvent) => {
    if (!isMobile || typeof window === "undefined") return;
    if (isExitingRef.current) return;
    
    if (event.state?.[GUARD_STATE_KEY] === true) {
      setShowExitDialog(true);
      
      const currentState = window.history.state || {};
      window.history.pushState(
        { ...currentState, depth: 1, [GUARD_STATE_KEY]: undefined }, 
        "", 
        window.location.href
      );
      setNavDepth(1);
      return;
    }
    
    const stateDepth = event.state?.depth;
    if (stateDepth !== undefined) {
      setNavDepth(stateDepth);
    } else {
      const currentDepth = getNavDepth();
      if (currentDepth > 1) {
        setNavDepth(currentDepth - 1);
      }
    }
  }, [isMobile, getNavDepth, setNavDepth]);

  const handleConfirmExit = useCallback(() => {
    setShowExitDialog(false);
    isExitingRef.current = true;
    
    try {
      sessionStorage.removeItem(NAV_DEPTH_KEY);
      sessionStorage.removeItem(GUARD_INSTALLED_KEY);
    } catch {
    }
    
    window.history.go(-2);
  }, []);

  const handleCancelExit = useCallback(() => {
    setShowExitDialog(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isMobile) return;

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isMobile, handlePopState]);

  return {
    showExitDialog,
    handleConfirmExit,
    handleCancelExit,
  };
}

export function BackButtonGuardDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent data-testid="dialog-exit-confirmation">
        <AlertDialogHeader>
          <AlertDialogTitle>Exit App?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to close the app?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} data-testid="button-cancel-exit">
            No, Stay
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} data-testid="button-confirm-exit">
            Yes, Exit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
