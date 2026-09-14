"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "danger";

interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = React.createContext<((message: string, tone?: Tone) => void) | null>(null);

/**
 * Small confirmations — "Copied", "Link copied", "Early end requested".
 *
 * Deliberately not a place for errors that need a decision: those belong in the
 * card or the dialog they came from, where the user is already looking.
 *
 * A toast is a small sheet slid onto the table and taken away again, so it is
 * `.sheet` at chit size with a rule around it. There are no tone icons and no tone
 * colours: `neutral` and `success` are the same slip, because "copied" does not need
 * a green tick to be believed, and `danger` gets the errata bar — the same ochre
 * leading rule an inline correction gets, so a failure looks like a failure wherever
 * it lands rather than borrowing a player's ink.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);

  const push = React.useCallback((message: string, tone: Tone = "neutral") => {
    const id = (nextId.current += 1);
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 left-1/2 z-toast flex -translate-x-1/2 flex-col items-center gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "sheet border-rule border-ink px-3.5 py-2.5 font-mono text-[12px] leading-[1.4] text-ink",
              toast.tone === "danger" && "border-l-heavy border-l-ochre",
            )}
            /* The same settle a placed card gets: a slip put down, not a pill sprung in. */
            style={{ animation: "card-settle var(--t-move) var(--ease-settle)" }}
          >
            {/* Wrapped, so `.sheet > *` lifts the words above the sheet's own fibre. */}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** No-ops outside a provider so a component is never coupled to being inside one. */
export function useToast() {
  return React.useContext(ToastContext) ?? (() => {});
}
