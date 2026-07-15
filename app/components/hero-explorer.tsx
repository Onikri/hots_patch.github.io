"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Open20Regular, Search20Regular } from "@/app/components/icons";
import { assetPath } from "@/app/lib/asset-path";
import type { HeroMeta } from "@/data/catalog";

const filters = [
  ["all", "Все"],
  ["anchor", "Якоря"],
  ["engage", "Инициаторы"],
  ["pick", "Ловцы"],
  ["zone", "Зонеры"],
  ["utility", "Утилити"],
] as const;

function matches(hero: HeroMeta, filter: string) {
  const text = `${hero.archetype} ${hero.tags.join(" ")}`.toLocaleLowerCase("ru");
  if (filter === "anchor") return /якор|защит|антидайв/.test(text);
  if (filter === "engage") return /дайв|энгейдж|скирмиш/.test(text);
  if (filter === "pick") return /ловец|изолятор|pick|таргет/.test(text);
  if (filter === "zone") return /зон|анти-мили|слепота/.test(text);
  if (filter === "utility") return /утилити|флекс|макро/.test(text);
  return true;
}

export function HeroExplorer({ heroes }: { heroes: HeroMeta[] }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.toLocaleLowerCase("ru").trim();
    return heroes.filter((hero) => matches(hero, filter) && (!needle || `${hero.name} ${hero.alias} ${hero.archetype} ${hero.tags.join(" ")}`.toLocaleLowerCase("ru").includes(needle)));
  }, [filter, heroes, query]);

  return (
    <section className="hero-explorer">
      <div className="explorer-controls">
        <div className="filter-row" role="group" aria-label="Фильтр по архетипу">
          {filters.map(([value, label]) => <button className={filter === value ? "is-active" : ""} type="button" onClick={() => setFilter(value)} key={value}>{label}</button>)}
        </div>
        <label className="roster-search"><Search20Regular aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти героя или тег" /><small>{visible.length} / {heroes.length}</small></label>
      </div>
      <div className="roster-grid">
        {visible.map((hero) => (
          <Link className="roster-card" href={`/heroes/${hero.slug}`} key={hero.slug} style={{ "--hero-accent": hero.accent } as React.CSSProperties}>
            <div className="roster-card__image"><img src={assetPath(`/heroes/${hero.slug}-thumb.jpg`)} width="520" height="736" alt={`Инфографика ${hero.name}`} loading="lazy" /></div>
            <div className="roster-card__head"><span>{hero.universe}</span><small>{hero.archetype}</small></div>
            <h2>{hero.name}</h2><strong>{hero.alias}</strong><p>{hero.summary}</p>
            <div className="roster-card__tags">{hero.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <div className="roster-card__metrics"><span>Вход <i style={{ "--value": `${hero.engage * 20}%` } as React.CSSProperties} /></span><span>Пил <i style={{ "--value": `${hero.peel * 20}%` } as React.CSSProperties} /></span><span>Макро <i style={{ "--value": `${hero.macro * 20}%` } as React.CSSProperties} /></span></div>
            <b className="roster-card__arrow"><Open20Regular /></b>
          </Link>
        ))}
      </div>
      {!visible.length ? <div className="empty-state">Под такой фильтр героев не нашлось. Сбрось запрос или выбери другой архетип.</div> : null}
    </section>
  );
}
