"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type SelectMenuOption<T extends string | number> = {
  value: T;
  label: string;
};

type MenuPosition = {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
};

export function SelectMenu<T extends string | number>({
  ariaLabel,
  className = "",
  disabled = false,
  onChange,
  options,
  tone = "light",
  value,
}: {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  onChange: (value: T) => void;
  options: ReadonlyArray<SelectMenuOption<T>>;
  tone?: "light" | "dark";
  value: T;
}) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<MenuPosition>({
    left: 0,
    maxHeight: 280,
    top: 0,
    width: 0,
  });
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const selectedLabel = options[selectedIndex]?.label ?? String(value);

  function close({ restoreFocus = false } = {}) {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function openMenu(index = selectedIndex) {
    if (disabled) return;
    setActiveIndex(index);
    setOpen(true);
  }

  function moveFocus(index: number) {
    const next = (index + options.length) % options.length;
    setActiveIndex(next);
    window.requestAnimationFrame(() => optionRefs.current[next]?.focus());
  }

  function choose(option: SelectMenuOption<T>) {
    onChange(option.value);
    close({ restoreFocus: true });
  }

  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const edge = 8;
      const gap = 5;
      const triggerRect = trigger.getBoundingClientRect();
      const naturalHeight = Math.min(menu.scrollHeight, 280);
      const below = window.innerHeight - triggerRect.bottom - edge;
      const above = triggerRect.top - edge;
      const openAbove = below < Math.min(naturalHeight, 180) && above > below;
      const availableHeight = Math.max(96, openAbove ? above - gap : below - gap);
      const maxHeight = Math.min(280, availableHeight);
      const width = Math.min(
        Math.max(triggerRect.width, menu.scrollWidth, 112),
        window.innerWidth - edge * 2
      );
      const left = Math.min(
        Math.max(edge, triggerRect.left),
        Math.max(edge, window.innerWidth - width - edge)
      );
      const renderedHeight = Math.min(naturalHeight, maxHeight);
      const top = openAbove
        ? Math.max(edge, triggerRect.top - renderedHeight - gap)
        : Math.min(triggerRect.bottom + gap, window.innerHeight - renderedHeight - edge);

      setPosition({ left, maxHeight, top, width });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close({ restoreFocus: true });
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => optionRefs.current[activeIndex]?.focus());
  }, [activeIndex, open]);

  const menu = open ? (
    <div
      ref={menuRef}
      id={listboxId}
      role="listbox"
      aria-label={ariaLabel}
      className={`nei-select-menu is-${tone}`}
      style={{
        left: position.left,
        maxHeight: position.maxHeight,
        top: position.top,
        width: position.width,
      }}
    >
      {options.map((option, index) => (
        <button
          key={String(option.value)}
          ref={(element) => {
            optionRefs.current[index] = element;
          }}
          type="button"
          role="option"
          aria-selected={option.value === value}
          className={option.value === value ? "is-selected" : undefined}
          onClick={() => choose(option)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              moveFocus(index + 1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              moveFocus(index - 1);
            } else if (event.key === "Home") {
              event.preventDefault();
              moveFocus(0);
            } else if (event.key === "End") {
              event.preventDefault();
              moveFocus(options.length - 1);
            } else if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              choose(option);
            } else if (event.key === "Tab") {
              close();
            }
          }}
        >
          <span>{option.label}</span>
          {option.value === value && <span className="nei-select-check" aria-hidden="true">✓</span>}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <span ref={rootRef} className={`nei-select ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className={`nei-select-trigger is-${tone}`}
        aria-label={`${ariaLabel}: ${selectedLabel}`}
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(selectedIndex);
          } else if (event.key === "Home") {
            event.preventDefault();
            openMenu(0);
          } else if (event.key === "End") {
            event.preventDefault();
            openMenu(options.length - 1);
          }
        }}
      >
        <span className="nei-select-value">{selectedLabel}</span>
        <span className="nei-select-chevron" aria-hidden="true" />
      </button>
      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </span>
  );
}
