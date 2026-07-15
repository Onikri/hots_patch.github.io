import type { Metadata } from "next";
import Link from "next/link";
import { Add20Regular, ArrowUpRight20Regular } from "@/app/components/icons";
import { glossary, sources } from "@/data/catalog";

export const metadata: Metadata = { title: "Источники и методология", description: "Как собран полный гайд, какие данные сверялись с live-патчами, PTR, Heroes Profile и сообществом." };

export default function SourcesPage() {
  return (
    <main id="main-content" className="page-shell sources-page">
      <section className="page-hero shell"><div className="eyebrow"><span>METHOD / SOURCES</span><i /><em>15 JUL 2026</em></div><div className="page-hero__grid"><h1>ОТКУДА<br /><span>ВЗЯТЫ ДАННЫЕ</span></h1><div><p>Основа сайта — весь предоставленный PDF. Интернет-источники не заменяют авторский текст: они помечают статус патча, уточняют изменяемые цифры и добавляют практический контекст.</p><dl><div><dt>657</dt><dd>страниц основы</dd></div><div><dt>{sources.length - 1}</dt><dd>внешних опор</dd></div></dl></div></div></section>

      <section className="shell patch-status" id="patch">
        <div className="patch-status__title"><span>PATCH INTELLIGENCE</span><h2>Live отдельно.<br />PTR отдельно.</h2><p>Это принципиально: тестовые изменения не объявляются действующей метой, пока Blizzard не выпускает их на live.</p></div>
        <div className="patch-cards">
          <article className="patch-card patch-card--live"><header><i />LIVE <span>CONFIRMED</span></header><strong>11 MAY 2026</strong><p>Официальный баланс-патч live. В частности, увеличил базовое здоровье Артаса с 2625 до 2750 и изменил ряд талантов Мал’Ганиса.</p><a href="https://news.blizzard.com/en-gb/article/24276959/heroes-of-the-storm-balance-patch-notes-may-11-2026" target="_blank" rel="noreferrer">Официальные заметки <ArrowUpRight20Regular /></a></article>
          <article className="patch-card patch-card--ptr"><header><i />PTR <span>TEST REALM</span></header><strong>29 JUN 2026</strong><p>Haunted Mines заявлена для Ranked, на Hanamura добавлены кусты, а у Warhead Junction сокращён штраф прерывания. До live это — тестовая ветка.</p><a href="https://news.blizzard.com/en-us/article/24287550/heroes-of-the-storm-ptr-patch-notes-june-29-2026" target="_blank" rel="noreferrer">PTR-заметки <ArrowUpRight20Regular /></a></article>
          <article className="patch-card patch-card--data"><header><i />DATA <span>COMMUNITY</span></header><strong>2.55.16.97039</strong><p>Heroes Profile на момент проверки отображает эту сборку и базу более чем из 64 млн реплеев. Винрейты — контекст, а не приказ к пику.</p><a href="https://www.heroesprofile.com/" target="_blank" rel="noreferrer">Открыть статистику <ArrowUpRight20Regular /></a></article>
        </div>
      </section>

      <section className="section shell method-section">
        <div className="section-head"><div><span className="section-index">01 / МЕТОД</span><h2>Что сохранено.<br />Что дополнено.</h2></div><p>Структура сделана так, чтобы не потерять ни объём, ни голос исходного материала — и при этом честно отделить устойчивые принципы от патч-зависимых цифр.</p></div>
        <div className="method-grid"><article><span>01</span><h3>Полный текст</h3><p>226 000+ слов распределены по 12 модулям, 13 досье и приложению. Удалены только переносы строк и артефакты PDF.</p></article><article><span>02</span><h3>Полный визуальный слой</h3><p>В досье возвращены все 205 страниц способностей, талантов и связок, а также 13 исходных профильных карточек.</p></article><article><span>03</span><h3>Внешняя сверка</h3><p>Патчи проверены по Blizzard; текущая статистика — по Heroes Profile; практические контраргументы — по профильным обсуждениям Reddit.</p></article><article><span>04</span><h3>Осторожно с метой</h3><p>Статические проценты быстро стареют. Поэтому сайт сильнее подчёркивает условия пика, геометрию и командные окна.</p></article></div>
      </section>

      <section className="section section--sources"><div className="shell"><div className="section-head section-head--compact"><div><span className="section-index">02 / БИБЛИОТЕКА</span><h2>Опорные<br />источники.</h2></div><p>Официальные данные выше мнения сообщества. Reddit используется для практических моделей и дискуссии, а не как источник цифр патча.</p></div><div className="source-list">{sources.map((source, index) => source.href ? <a href={source.href} target="_blank" rel="noreferrer" key={source.title}><span>{String(index + 1).padStart(2,"0")}</span><div><small>{source.kind}</small><h3>{source.title}</h3><p>{source.description}</p></div><i><ArrowUpRight20Regular /></i></a> : <article key={source.title}><span>{String(index + 1).padStart(2,"0")}</span><div><small>{source.kind}</small><h3>{source.title}</h3><p>{source.description}</p></div><i>LOCAL</i></article>)}</div></div></section>

      <section className="section shell glossary-section"><div className="section-head"><div><span className="section-index">03 / СЛОВАРЬ</span><h2>Говорить<br />на одном языке.</h2></div><p>Термины оставлены в той форме, в которой ими пользуются в игре и голосовой коммуникации.</p></div><div className="glossary-grid">{glossary.map(([term, definition], index) => <details key={term} open={index < 3}><summary><span>{String(index + 1).padStart(2,"0")}</span><strong>{term}</strong><i><Add20Regular /></i></summary><p>{definition}</p></details>)}</div><div className="sources-cta"><p>Дальше — не в теорию, а в ситуацию.</p><Link className="button button--primary" href="/lab">Открыть полигон <ArrowUpRight20Regular /></Link></div></section>
    </main>
  );
}
