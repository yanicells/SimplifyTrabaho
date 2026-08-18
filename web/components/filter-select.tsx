"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Custom select: pill trigger + styled listbox popover. Exists because the
 * native <select> menu can't be themed — this one follows the design system
 * (paper card, hairline border, pill-adjacent rows, check on the selection).
 *
 * Keyboard: Enter/Space/ArrowDown open; arrows move; Enter picks; Esc closes.
 */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
  active = false,
  dense = false,
  menuAlign = "left",
}: {
  /** Accessible name for the control. */
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  /** Applied filter — polarity-flips the trigger to ink. */
  active?: boolean;
  /** Compact 36px trigger — matches the rail's chips (filter panel, tracker rows). */
  dense?: boolean;
  menuAlign?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[selectedIndex];

  // Close on any press outside the control.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Focus follows the roving index while the list is open.
  useEffect(() => {
    if (open) optionRefs.current[focusIndex]?.focus();
  }, [open, focusIndex]);

  function openList() {
    setFocusIndex(selectedIndex);
    setOpen(true);
  }

  function pick(index: number) {
    onChange(options[index].value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIndex((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setFocusIndex(options.length - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            openList();
          }
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
          dense ? "h-9 pl-3.5 pr-2.5" : "h-11 pl-4 pr-3"
        } ${active ? "bg-ink text-paper" : "bg-soft text-ink hover:bg-press"}`}
      >
        <span className="truncate">{selected?.label}</span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""} ${
            active ? "text-paper" : "text-faint"
          }`}
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute z-30 mt-2 min-w-full overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_4px_16px_rgba(0,0,0,0.16)] ${
            menuAlign === "right" ? "right-0" : "left-0"
          }`}
        >
          <div
            id={listId}
            role="listbox"
            aria-label={label}
            onKeyDown={onListKeyDown}
            className="max-h-72 overflow-y-auto p-1.5"
          >
            {options.map((option, i) => {
              const isSelected = i === selectedIndex;
              return (
                <button
                  key={option.value}
                  ref={(el) => {
                    optionRefs.current[i] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={i === focusIndex ? 0 : -1}
                  onClick={() => pick(i)}
                  // Roving focus is moved programmatically, so this stays :focus —
                  // :focus-visible would drop the highlight after a mouse open.
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-soft focus:bg-soft focus:outline-none ${
                    isSelected ? "font-semibold" : "font-normal"
                  }`}
                >
                  <span className="whitespace-nowrap">{option.label}</span>
                  {isSelected && (
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden
                      className="h-4 w-4 shrink-0"
                    >
                      <path
                        d="M3 8.5l3.5 3.5L13 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
