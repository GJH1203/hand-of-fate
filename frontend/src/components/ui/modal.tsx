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
 *
 * A dialog is a panel with an arched head, standing on the axis. The overlay dims
 * the firmament rather than blurring it: frosted glass is a lens, and there is no
 * glass in this design — the sky behind is simply further from the light.
 *
 * THE HEAD IS A TYMPANUM RATHER THAN AN ARCH ON THE PANEL ITSELF, and the reason is
 * geometric. `--arch` is a semicircular head expressed as a percentage — 50% of the
 * width by 22% of the height — so on a tall dialog it eats the top corners entirely:
 * measured on a 448×400 panel the border at 12px in from the right edge is already
 * 60px down the page, and a close control in that corner floats outside the frame.
 * Arching a fixed-height band at the head instead keeps the arch, keeps the panel's
 * corners square, and leaves the two spandrels beside the dome as real space. The
 * close control stands in the right-hand one, which is what a spandrel is for.
 */
/*
 * Shared across every Modal on the page — see the counted scroll lock below.
 */
let openModalCount = 0;
let previousBodyOverflow = "";

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

    /*
     * The scroll lock is counted, not saved and restored per dialog.
     *
     * Each open dialog used to snapshot `document.body.style.overflow` and put it
     * back on close. With two dialogs open at once — which the arena reaches when
     * a player has "Leave the duel?" up and the game then finishes underneath it —
     * the second snapshots the first one's "hidden", and closing them in that
     * order restores "hidden" to the body permanently. The page is then
     * unscrollable for the rest of the session with no dialog on screen to
     * explain it.
     *
     * A counter cannot get this wrong: the first dialog locks, the last one out
     * unlocks, and any order in between is fine.
     */
    openModalCount += 1;
    if (openModalCount === 1) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
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
      openModalCount -= 1;
      if (openModalCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-overlay flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(3,4,10,0.72)" }}
      onMouseDown={(event) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn("panel relative w-full outline-none", widthClassName, className)}
        /*
         * `card-settle` is the keyframe a placed card uses: it arrives a few pixels
         * proud and settles onto the ground. A dialog is a panel being set down, so
         * it gets the same motion rather than a scale-and-fade of its own.
         */
        style={{ animation: "card-settle var(--t-move) var(--ease-rise)" }}
      >
        {(title || showCloseButton) && (
          /* Without a title there is no dome, so the band still has to reserve the
             height the close control stands in. */
          <div className={cn("relative", !title && "h-12")}>
            {title && (
              <div className="mx-12 mt-4 rounded-arch bg-night-2 px-5 pb-3 pt-6">
                <h2 className="type-h2 text-center text-gold-lit">{title}</h2>
              </div>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center text-parchment-3 transition-colors duration-lume hover:bg-night-2 hover:text-gold-lit"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            )}
          </div>
        )}

        <div
          className={contentClassName ?? cn("px-6", title || showCloseButton ? "pb-6 pt-5" : "py-6")}
        >
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-center gap-3 border-t-hair border-gold-deep px-6 py-4">
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
      {/* Centred, like everything else here: a question put to somebody is set on
          the axis, not ranged left with its answers pushed into a corner. */}
      <p className="type-small mx-auto max-w-[42ch] text-center text-parchment-2">{description}</p>
      <div className="mt-7 flex justify-center gap-3">
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
