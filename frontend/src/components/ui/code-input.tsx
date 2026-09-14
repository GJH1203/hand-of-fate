"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  "aria-label"?: string;
}

const ALLOWED = /[^A-Z0-9]/g;

/**
 * The room code, one character per slot — six letterpress slugs in a stick.
 *
 * A six-character code pasted into a single text field is a form. Six slots is a
 * game — and it is also the only shape that makes a mistyped character obvious at
 * a glance. Typing advances, backspace retreats, and pasting the whole code (with
 * or without the surrounding link) fills every slot at once.
 *
 * 32px, and that is now the only size the code is ever set at. It used to be 44px
 * in the lobby and 30px here, which meant the thing you read off one screen and
 * typed into the other did not look like the same object.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  autoFocus,
  "aria-label": ariaLabel = "Room code",
}: CodeInputProps) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  const commit = (next: string) => {
    const clean = next.toUpperCase().replace(ALLOWED, "").slice(0, length);
    onChange(clean);
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
            // `block`, because `.slug` is written for a flex box and this is an input.
            "slug block h-16 w-12 text-center text-ink caret-verm",
            // The mono, not the display serif: a room code is read out loud and typed
            // back in, so it wants unambiguous figures, not elegant ones.
            "type-code",
            /*
             * `.type-code` tracks at 0.28em, which is right for a code set as one run
             * of characters. Here the gap between the slugs is the tracking, and the
             * trailing 0.28em on a single centred character would push it visibly
             * left of its box.
             */
            "tracking-[0]",
            /*
             * Focus is a heavier impression, not a glow and not a lift. Border-box
             * sizing means going from 1.5px to 3px moves nothing on the page. The
             * offset outline from globals.css is left alone on top of it.
             */
            "transition-[border-width] duration-ink focus:border-heavy",
          )}
        />
      ))}
    </div>
  );
}
