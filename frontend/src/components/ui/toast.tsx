"use client";

import * as React from "react";
import { Check, CircleAlert, Info } from "lucide-react";

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
        className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2"
      >
        {toasts.map((toast) => {
          const Icon = toast.tone === "success" ? Check : toast.tone === "danger" ? CircleAlert : Info;
          return (
            <div
              key={toast.id}
              className="flex items-center gap-2 rounded-md border border-strong bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink-hi shadow-card"
              style={{ animation: "toast-in 200ms cubic-bezier(0.2,0.8,0.2,1)" }}
            >
              <Icon
                size={16}
                strokeWidth={1.75}
                className={
                  toast.tone === "success"
                    ? "text-success"
                    : toast.tone === "danger"
                      ? "text-danger"
                      : "text-arcane-300"
                }
              />
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/** No-ops outside a provider so a component is never coupled to being inside one. */
export function useToast() {
  return React.useContext(ToastContext) ?? (() => {});
}
