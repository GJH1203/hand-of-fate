"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Off for anything you would hate to dismiss by a stray click — the tutorial. */
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  /** Tailwind max-width class. Modals size to their content, not to a grid. */
  widthClassName?: string;
  className?: string;
  /** Overrides the default body padding — for dialogs that lay out their own bands. */
  contentClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Every dialog in the application — confirmations, the join form, the tutorial,
 * the result screen. `window.alert` is not used anywhere.
 */
export function Modal({
  open,
  onClose,
  title,
  closeOnOverlayClick = true,
  showCloseButton = true,
  widthClassName = "max-w-md",
  className,
  contentClassName,
  children,
  footer,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // `onClose` is nearly always an inline arrow, so its identity changes on every
  // render of the parent. Reading it from a ref keeps the effect below tied to
  // `open` alone — with onClose in the dependency array the effect tore down and
  // set up again on every keystroke, and its setup moves focus to the dialog, so
  // typing into anything inside a modal lost the caret after one character.
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Only take focus if the dialog's own content has not already claimed it —
    // otherwise this undoes the autoFocus on the first field.
    if (!panelRef.current?.contains(document.activeElement)) {
      panelRef.current?.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(6,8,16,0.7)", backdropFilter: "blur(6px)" }}
      onMouseDown={(event) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "relative w-full rounded-lg border border-strong bg-surface-1 shadow-card outline-none",
          widthClassName,
          className,
        )}
        style={{ animation: "modal-in 150ms cubic-bezier(0.2,0.8,0.2,1)" }}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
            {title ? <h2 className="type-h2 text-ink-hi">{title}</h2> : <span />}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-low transition-colors duration-150 hover:bg-surface-3 hover:text-ink-hi focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcane-400"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            )}
          </div>
        )}

        <div className={contentClassName ?? cn("px-6", title || showCloseButton ? "pb-6" : "py-6")}>
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-subtle px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` for anything that throws work away. */
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} widthClassName="max-w-sm">
      <p className="text-sm text-ink-mid">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={tone} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
