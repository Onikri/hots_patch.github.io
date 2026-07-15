"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight20Regular, Dismiss20Regular, Search20Regular } from "@/app/components/icons";

type Entry = {
  label: string;
  meta: string;
  href: string;
  keywords: string;
};

export function GlobalSearch({ entries }: { entries: Entry[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if ((event.key === "/" && !isTyping) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const results = useMemo(() => {
    const needle = query.toLocaleLowerCase("ru").trim();
    if (!needle) return entries.slice(0, 8);
    return entries
      .filter((entry) => `${entry.label} ${entry.meta} ${entry.keywords}`.toLocaleLowerCase("ru").includes(needle))
      .slice(0, 10);
  }, [entries, query]);

  return (
    <>
      <button className="search-trigger" type="button" onClick={() => setOpen(true)} aria-label="Открыть поиск">
        <Search20Regular aria-hidden="true" />
        <em>Поиск</em>
        <kbd>⌘ K</kbd>
      </button>
      {open ? (
        <div className="search-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section className="search-dialog" role="dialog" aria-modal="true" aria-label="Поиск по гайду">
            <div className="search-field">
              <Search20Regular aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Модуль, герой, термин…"
                aria-label="Поисковый запрос"
              />
              <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть поиск"><Dismiss20Regular /><span>ESC</span></button>
            </div>
            <div className="search-results">
              <p>{query ? `Найдено: ${results.length}` : "Быстрый доступ"}</p>
              {results.length ? results.map((entry) => (
                <Link key={entry.href} href={entry.href} onClick={() => setOpen(false)}>
                  <span><strong>{entry.label}</strong><small>{entry.meta}</small></span>
                  <i aria-hidden="true"><ArrowUpRight20Regular /></i>
                </Link>
              )) : (
                <div className="search-empty">Ничего не найдено. Попробуй «вижен», «Диабло» или «драфт».</div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
