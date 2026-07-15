import type { Metadata } from "next";
import Link from "next/link";
import { HeroExplorer } from "../components/hero-explorer";
import { BookOpen24Regular } from "../components/icons";
import { heroes } from "@/data/catalog";

export const metadata: Metadata = {
  title: "13 танков",
  description: "Полные профили 13 танков Heroes of the Storm: билды, карты, синергии, контрпики и микро-фишки.",
};

export default function HeroesPage() {
  return (
    <main id="main-content" className="page-shell">
      <section className="page-hero page-hero--roster shell">
        <div className="eyebrow"><span>MODULE 11</span><i /> <em>13 FIELD PROFILES</em></div>
        <div className="page-hero__grid">
          <h1>ВЫБЕРИ<br /><span>ФОРМУ КОНТРОЛЯ</span></h1>
          <div><p>У каждого танка — своя геометрия, темп и цена ошибки. Фильтр не выдаёт «тир-лист»: он помогает найти правильный инструмент под задачу драфта.</p><dl><div><dt>13</dt><dd>полных профилей</dd></div><div><dt>170K+</dt><dd>слов разбора</dd></div></dl><Link className="text-link" href="/guide/roster"><BookOpen24Regular /> Читать теорию пула и архетипов</Link></div>
        </div>
      </section>
      <div className="shell"><HeroExplorer heroes={heroes} /></div>
    </main>
  );
}
