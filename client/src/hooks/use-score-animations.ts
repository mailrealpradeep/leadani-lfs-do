import { useState, useEffect, useCallback, useRef } from "react";
import { ANIMATION_DURATIONS } from "@/lib/powerscore-constants";

interface AnimatedCounterOptions {
  duration?: number;
  easing?: "linear" | "easeOut" | "easeInOut";
}

export function useAnimatedCounter(
  targetValue: number,
  options: AnimatedCounterOptions = {}
) {
  const { duration = 1000, easing = "easeOut" } = options;
  const [displayValue, setDisplayValue] = useState(targetValue);
  const startValueRef = useRef(targetValue);
  const animationRef = useRef<number>();

  const easingFunctions = {
    linear: (t: number) => t,
    easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  };

  useEffect(() => {
    const startValue = startValueRef.current;
    const difference = targetValue - startValue;
    
    if (difference === 0) return;

    const startTime = performance.now();
    const easingFn = easingFunctions[easing];

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);
      
      const currentValue = Math.round(startValue + difference * easedProgress);
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        startValueRef.current = targetValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration, easing]);

  return displayValue;
}

interface PulseState {
  isPulsing: boolean;
  triggerPulse: () => void;
}

export function usePulseAnimation(duration = ANIMATION_DURATIONS.pulseGlow): PulseState {
  const [isPulsing, setIsPulsing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const triggerPulse = useCallback(() => {
    setIsPulsing(true);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsPulsing(false);
    }, duration);
  }, [duration]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isPulsing, triggerPulse };
}

interface CelebrationState {
  isActive: boolean;
  message: string | null;
  points: number | null;
  trigger: (message: string, points: number) => void;
  dismiss: () => void;
}

export function useCelebration(autoDismissDelay = ANIMATION_DURATIONS.celebration): CelebrationState {
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const trigger = useCallback((msg: string, pts: number) => {
    setMessage(msg);
    setPoints(pts);
    setIsActive(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
    }, autoDismissDelay);
  }, [autoDismissDelay]);

  const dismiss = useCallback(() => {
    setIsActive(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isActive, message, points, trigger, dismiss };
}

export function useScoreChangeDetection(currentScore: number) {
  const previousScoreRef = useRef(currentScore);
  const [scoreChange, setScoreChange] = useState<number | null>(null);

  useEffect(() => {
    const diff = currentScore - previousScoreRef.current;
    if (diff !== 0) {
      setScoreChange(diff);
      previousScoreRef.current = currentScore;
      
      const timeout = setTimeout(() => {
        setScoreChange(null);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [currentScore]);

  return scoreChange;
}
