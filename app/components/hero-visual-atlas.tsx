"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppsListDetail24Regular,
  ChevronLeft24Regular,
  ChevronRight24Regular,
  Dismiss24Regular,
  Flash24Regular,
  Timeline24Regular,
  ZoomIn24Regular,
} from "@/app/components/icons";
import { assetPath } from "@/app/lib/asset-path";

export type HeroVisual = { title: string; page: number; src: string; thumb: string };
export type HeroVisualGroups = {
  abilities: HeroVisual[];
  talents: HeroVisual[];
  combos: HeroVisual[];
};

type Category = keyof HeroVisualGroups;

const categories: Array<{
  id: Category;
  label: string;
  eyebrow: string;
  description: string;
  icon: typeof Flash24Regular;
}> = [
  {
    id: "abilities",
    label: "Способности",
    eyebrow: "ABILITIES",
    description: "Форма области, радиусы, подготовка, кулдаун, стоимость, эффекты и связанные таланты.",
    icon: Flash24Regular,
  },
  {
    id: "talents",
    label: "Таланты",
    eyebrow: "TALENT MATRIX",
    description: "Все оригинальные страницы билдов: базовый выбор, ситуативные ветки и логика адаптации.",
    icon: AppsListDetail24Regular,
  },
  {
    id: "combos",
    label: "Связки",
    eyebrow: "COMBO TIMELINES",
    description: "Посекундные таймлайны нажатий, контрольные окна, подготовка и условия успешного прокаста.",
    icon: Timeline24Regular,
  },
];

export function HeroVisualAtlas({ heroName, groups }: { heroName: string; groups: HeroVisualGroups }) {
  const [category, setCategory] = useState<Category>("abilities");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeIndex = categories.findIndex((item) => item.id === category);
  const active = categories[activeIndex];
  const items = groups[category];
  const selected = selectedIndex === null ? null : items[selectedIndex];

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedIndex(null);
      if (event.key === "ArrowLeft") setSelectedIndex((value) => value === null ? null : (value - 1 + items.length) % items.length);
      if (event.key === "ArrowRight") setSelectedIndex((value) => value === null ? null : (value + 1) % items.length);
    };
    document.body.classList.add("has-lightbox");
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => closeRef.current?.focus(), 20);
    return () => {
      document.body.classList.remove("has-lightbox");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [items.length, selectedIndex]);

  const total = useMemo(
    () => categories.reduce((sum, item) => sum + groups[item.id].length, 0),
    [groups],
  );

  const changeCategory = (next: Category) => {
    setCategory(next);
    setSelectedIndex(null);
  };

  const step = (direction: number) => {
    setSelectedIndex((value) => value === null ? null : (value + direction + items.length) % items.length);
  };

  return (
    <section className="visual-atlas shell" id="visual-atlas" aria-labelledby="visual-atlas-title">
      <div className="visual-atlas__glass">
        <header className="visual-atlas__head">
          <div>
            <span>ORIGINAL PDF / VISUAL LAYER</span>
            <h2 id="visual-atlas-title">Визуальный атлас {heroName}</h2>
            <p>Оригинальные карточки из документа возвращены без пересборки и упрощения. Открывай любую страницу в полном размере.</p>
          </div>
          <dl><div><dt>{total}</dt><dd>визуальных страниц</dd></div><div><dt>3</dt><dd>группы</dd></div></dl>
        </header>

        <div
          className="morph-tabs"
          role="tablist"
          aria-label="Категории визуального атласа"
          style={{ "--active-tab": activeIndex } as CSSProperties}
        >
          <span className="morph-tabs__surface" aria-hidden="true" />
          {categories.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={category === item.id ? "is-active" : ""}
                type="button"
                role="tab"
                aria-selected={category === item.id}
                onClick={() => changeCategory(item.id)}
                key={item.id}
              >
                <Icon /><span>{item.label}</span><small>{groups[item.id].length}</small>
              </button>
            );
          })}
        </div>

        <div className="visual-atlas__intro" role="tabpanel">
          <span>{active.eyebrow}</span>
          <p>{active.description}</p>
        </div>

        <div className="visual-grid">
          {items.map((item, index) => (
            <button className="visual-card" type="button" onClick={() => setSelectedIndex(index)} key={item.src}>
              <span className="visual-card__image">
                <img src={assetPath(item.thumb)} width="520" height="735" alt={`${heroName}: ${item.title}, страница ${item.page}`} loading="lazy" />
                <i><ZoomIn24Regular /></i>
              </span>
              <span className="visual-card__caption"><small>PDF · PAGE {item.page}</small><strong>{item.title}</strong></span>
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <div className="visual-lightbox" role="dialog" aria-modal="true" aria-label={`${heroName}: ${selected.title}`} onMouseDown={(event) => event.target === event.currentTarget && setSelectedIndex(null)}>
          <div className="visual-lightbox__window">
            <header><span><small>{active.label} · PDF {selected.page}</small><strong>{selected.title}</strong></span><button ref={closeRef} type="button" onClick={() => setSelectedIndex(null)} aria-label="Закрыть просмотр"><Dismiss24Regular /></button></header>
            <div className="visual-lightbox__canvas"><img src={assetPath(selected.src)} width="1500" height="2121" alt={`${heroName}: ${selected.title}`} /></div>
            <footer>
              <button type="button" onClick={() => step(-1)} aria-label="Предыдущая карточка"><ChevronLeft24Regular /><span>Назад</span></button>
              <span>{String((selectedIndex ?? 0) + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
              <button type="button" onClick={() => step(1)} aria-label="Следующая карточка"><span>Дальше</span><ChevronRight24Regular /></button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
