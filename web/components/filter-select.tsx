"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface FilterOption {
  value: string;
  label: string;
  /** Live result count shown beside the option (multi-select); 0 dims the row. */
  count?: number;
}

export interface FilterGroup {
  label: string;
  options: FilterOption[];
}

type SingleProps = {
  multiple?: false;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
};

type MultiProps = {
  multiple: true;
  values: string[];
  /** Rendered as labeled columns on sm+, one stacked list on phones. */
  groups: FilterGroup[];
  onChange: (values: string[]) => void;
  /** Trigger text when nothing is picked; "{placeholder} · N" for several. */
  placeholder: string;
};

/**
 * Custom select: pill trigger + styled listbox popover. Exists because the
 * native <select> menu can't be themed — this one follows the design system
 * (paper card, hairline border, pill-adjacent rows, check on the selection).
 *
 * `multiple` turns it into a checkbox list with counts, grouped columns, and a
 * Clear / Done footer; picking keeps it open. On phones the multi list opens
 * in-flow (a full-width sheet inside the filter panel) instead of floating.
 *
 * Keyboard: Enter/Space/ArrowDown open; arrows move; Enter/Space pick (toggle);
 * Esc closes.
 */
export function FilterSelect(
  props: (SingleProps | MultiProps) & {
    /** Accessible name for the control. */
    label: string;
    /** Applied filter — polarity-flips the trigger to ink. */
    active?: boolean;
    /** Compact 36px trigger — matches the rail's chips (filter panel, tracker rows). */
    dense?: boolean;
    menuAlign?: "left" | "right";
  },
) {
  const { label, active = false, dense = false, menuAlign = "left" } = props;
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listId = useId();

  const options = props.multiple ? props.groups.flatMap((g) => g.options) : props.options;
  const isSelected = (option: FilterOption) =>
    props.multiple ? props.values.includes(option.value) : option.value === props.value;
  const selectedIndex = Math.max(0, options.findIndex(isSelected));

  let triggerText: string | undefined;
  if (!props.multiple) triggerText = options[selectedIndex]?.label;
  else if (props.values.length === 0) triggerText = props.placeholder;
  else if (props.values.length === 1)
    triggerText = options.find((o) => o.value === props.values[0])?.label;
  else triggerText = `${props.placeholder} · ${props.values.length}`;

  // Close on any press outside the control. The phone multi list is in-flow, so
  // it waits for the full click: collapsing on pointerdown would shift the
  // layout and make the pressed control (e.g. "Show N roles") miss its click.
  const outsideEvent = props.multiple ? "click" : "pointerdown";
  useEffect(() => {
    if (!open) return;
    function onOutside(e: Event) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener(outsideEvent, onOutside);
    return () => document.removeEventListener(outsideEvent, onOutside);
  }, [open, outsideEvent]);

  // Focus follows the roving index while the list is open.
  useEffect(() => {
    if (open) optionRefs.current[focusIndex]?.focus();
  }, [open, focusIndex]);

  function openList() {
    setFocusIndex(selectedIndex);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function pick(index: number) {
    const value = options[index].value;
    if (props.multiple) {
      setFocusIndex(index);
      props.onChange(
        props.values.includes(value)
          ? props.values.filter((v) => v !== value)
          : [...props.values, value],
      );
    } else {
      props.onChange(value);
      close();
    }
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
    } else if (e.key === "Tab" && !props.multiple) {
      // Multi keeps Tab for its Clear / Done footer.
      setOpen(false);
    }
  }

  function renderOption(option: FilterOption, i: number) {
    const selected = isSelected(option);
    const dim = props.multiple && option.count === 0 && !selected;
    return (
      <button
        key={option.value}
        ref={(el) => {
          optionRefs.current[i] = el;
        }}
        type="button"
        role="option"
        aria-selected={selected}
        tabIndex={i === focusIndex ? 0 : -1}
        onClick={() => pick(i)}
        // Roving focus is moved programmatically, so this stays :focus —
        // :focus-visible would drop the highlight after a mouse open.
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-soft focus:bg-soft focus:outline-none ${
          props.multiple ? "" : "justify-between"
        } ${selected ? "font-semibold" : "font-normal"} ${dim ? "text-mute" : ""}`}
      >
        {props.multiple && (
          <span
            aria-hidden
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
              selected ? "border-ink bg-ink text-paper" : "border-mute bg-paper"
            }`}
          >
            {selected && <CheckIcon className="h-3 w-3" />}
          </span>
        )}
        <span className={props.multiple ? "min-w-0 flex-1 truncate" : "whitespace-nowrap"}>
          {option.label}
        </span>
        {props.multiple && option.count !== undefined && (
          <span
            className={`shrink-0 text-xs font-normal tabular-nums ${dim ? "" : "text-faint"}`}
          >
            {option.count.toLocaleString("en-US")}
          </span>
        )}
        {!props.multiple && selected && <CheckIcon className="h-4 w-4 shrink-0" />}
      </button>
    );
  }

  const panelClass = props.multiple
    ? // Phones: in-flow sheet, full width of the filter panel. sm+: floating card.
      "mt-2 rounded-2xl border border-line bg-paper sm:absolute sm:z-30 sm:w-[min(50rem,calc(100vw-3rem))] sm:shadow-[0_4px_16px_rgba(0,0,0,0.16)]"
    : "absolute z-30 mt-2 min-w-full overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_4px_16px_rgba(0,0,0,0.16)]";

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
        <span className="truncate">{triggerText}</span>
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
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
          className={`${panelClass} ${menuAlign === "right" ? "right-0" : "left-0"}`}
        >
          <div
            id={listId}
            role="listbox"
            aria-label={label}
            aria-multiselectable={props.multiple || undefined}
            onKeyDown={onListKeyDown}
            className={
              props.multiple
                ? "grid gap-x-1 gap-y-3 p-1.5 pt-3 sm:grid-cols-3"
                : "max-h-72 overflow-y-auto p-1.5"
            }
          >
            {props.multiple
              ? props.groups.map((group) => (
                  <div key={group.label} role="group" aria-label={group.label}>
                    <p aria-hidden className="px-3 pb-1 text-xs font-medium text-faint">
                      {group.label}
                    </p>
                    {group.options.map((option) =>
                      renderOption(option, options.indexOf(option)),
                    )}
                  </div>
                ))
              : options.map((option, i) => renderOption(option, i))}
          </div>

          {props.multiple && (
            <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-2.5">
              <button
                type="button"
                onClick={() => props.onChange([])}
                disabled={props.values.length === 0}
                className="rounded-sm text-sm font-medium text-ink underline underline-offset-2 hover:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:text-mute disabled:no-underline"
              >
                Clear
              </button>
              {/* Phones close the whole panel with its sticky "Show N roles" instead. */}
              <button
                type="button"
                onClick={close}
                className="hidden h-9 items-center rounded-full bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 sm:inline-flex"
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M3 8.5l3.5 3.5L13 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
