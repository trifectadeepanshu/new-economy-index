"use client";

import { useEffect, useState } from "react";

export type TocItem = { id: string; n: string; label: string };

/** Sticky "on this page" nav with scroll-spy highlighting of the active section. */
export function MethodologyToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items
      .map((it) => document.getElementById(it.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Treat a section as active once its heading clears the sticky top bar.
      { rootMargin: "-88px 0px -68% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  return (
    <aside className="nei-doc-toc" aria-label="On this page">
      <span className="nei-doc-toc-label">On this page</span>
      <nav className="nei-doc-toc-nav">
        {items.map((it) => (
          <a
            key={it.id}
            href={`#${it.id}`}
            className={`nei-doc-toc-link${active === it.id ? " is-active" : ""}`}
            aria-current={active === it.id ? "true" : undefined}
          >
            <span className="nei-doc-toc-n nei-mono">{it.n}</span>
            <span>{it.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}
