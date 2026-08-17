"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  /** Fires when the last slot is filled — lets Enter-free flows submit on completion. */
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  "aria-label"?: string;
}

const ALLOWED = /[^A-Z0-9]/g;

/**
 * The room code, one character per slot.
 *
 * A six-character code pasted into a single text field is a form. Six slots is a
 * game — and it is also the only shape that makes a mistyped character obvious at
 * a glance. Typing advances, backspace retreats, and pasting the whole code (with
 * or without the surrounding link) fills every slot at once.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  onComplete,
  autoFocus,
  "aria-label": ariaLabel = "Battle code",
}: CodeInputProps) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  const commit = (next: string) => {
    const clean = next.toUpperCase().replace(ALLOWED, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  };

  const focusSlot = (index: number) => {
    const target = refs.current[Math.max(0, Math.min(length - 1, index))];
    target?.focus();
    target?.select();
  };

  const handleChange = (index: number, raw: string) => {
    const typed = raw.toUpperCase().replace(ALLOWED, "");
    if (!typed) return;

    // Typing into a slot replaces that slot; a burst of characters (a phone
    // keyboard, an autofill) spills into the ones after it.
    const chars = value.padEnd(length, " ").split("");
    for (let i = 0; i < typed.length && index + i < length; i += 1) {
      chars[index + i] = typed[i];
    }
    const next = commit(chars.join("").trimEnd());
    focusSlot(Math.min(index + typed.length, length - 1));
    if (next.length === length) refs.current[length - 1]?.blur();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (value[index]) {
        commit(value.slice(0, index) + value.slice(index + 1));
        focusSlot(index);
      } else {
        commit(value.slice(0, Math.max(0, index - 1)));
        focusSlot(index - 1);
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusSlot(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusSlot(index + 1);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text");
    // A shared portal link ends in the code; take the tail either way.
    const candidate = pasted.toUpperCase().replace(ALLOWED, "").slice(-length);
    const next = commit(candidate);
    focusSlot(next.length);
  };

  return (
    <div className="flex justify-center gap-2" role="group" aria-label={ariaLabel}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={value[index] ?? ""}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus && index === 0}
          aria-label={`${ariaLabel}, character ${index + 1} of ${length}`}
          className={cn(
            "h-16 w-[52px] rounded-md border border-subtle bg-surface-2 text-center",
            "font-display text-[28px] font-semibold uppercase text-gold-300 tabular",
            "transition-[border-color,box-shadow] duration-150 caret-arcane-300",
            "focus:border-arcane-400 focus:outline-none focus:shadow-glow-violet",
          )}
        />
      ))}
    </div>
  );
}
