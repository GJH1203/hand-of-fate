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
 * The room code, one character per slot — six arched niches in a row.
 *
 * A six-character code pasted into a single text field is a form. Six slots is a
 * game, and an arch around each one makes it an arcade: the same three-bay rhythm
 * the board is built on, which is the one place in this interface where the shape
 * language and the thing being shown are the same idea. An arch marks a niche —
 * something that holds a figure — and a character of a code is exactly that.
 *
 * Typing advances, backspace retreats, and pasting the whole code (with or without
 * the surrounding link) fills every slot at once.
 *
 * `.type-code` is the only size the code is ever set at. It used to be 44px in the
 * lobby and 30px here, which meant the thing you read off one screen and typed into
 * the other did not look like the same object.
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
            // The niche carries the arch, the night-2 fill and the gold-lit letter.
            "slug block h-16 w-12 text-center caret-gold",
            // Marcellus, because a room code is read aloud off one screen and typed
            // into another: these are the inscriptional capitals, and the figures are
            // lining and tabular so every slot is the same width whatever is in it.
            "type-code",
            /*
             * `.type-code` tracks at 0.3em, which is right for a code set as one run
             * of characters. Here the gap between the niches is the tracking, and the
             * trailing 0.3em on a single centred character would push it visibly left
             * of its box.
             */
            "tracking-[0]",
            /*
             * Focus takes the rule from the recess to the leaf — the niche lights up
             * rather than lifting. Border-box sizing and an unchanged width mean
             * nothing on the page moves. The offset nimbus from globals.css is left
             * alone on top of it.
             */
            "transition-colors duration-lume focus:border-gold",
          )}
        />
      ))}
    </div>
  );
}
