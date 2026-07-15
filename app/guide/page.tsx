import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight20Regular, DocumentBulletList24Regular } from "@/app/components/icons";
import guideData from "@/data/guide-content.json";
import { modules } from "@/data/catalog";

export const metadata: Metadata = {
  title: "Полный гайд",
  description: "Все 12 модулей 657-страничного гайда по роли танка в Heroes of the Storm.",
};

export default function GuideIndex() {
  return (
    <main id="main-content" className="page-shell">
      <section className="page-hero shell">
        <div className="eyebrow"><span>FULL MANUAL</span><i /> <em>12 МОДУЛЕЙ</em></div>
        <div className="page-hero__grid">
          <h1>ПОЛНЫЙ<br /><span>ПОЛЕВОЙ ГАЙД</span></h1>
          <div><p>От философии роли до драфта и 13 героев. Весь текст исходного PDF разложен по читаемым маршрутам — ничего не ужато до «пяти советов».</p><dl><div><dt>226 485</dt><dd>слов в базе</dd></div><div><dt>657</dt><dd>страниц источника</dd></div></dl></div>
        </div>
      </section>

      <section className="shell guide-map">
        <div className="guide-map__legend"><span>Маршрут обучения</span><p>Начинай с 00, если строишь роль с нуля. Если уже играешь — входи через свою проблему.</p></div>
        <div className="guide-map__grid">
          {modules.map((module) => {
            const stats = guideData.modules.find((item) => item.id === module.id);
            const href = module.id === 11 ? "/heroes" : `/guide/${module.slug}`;
            return (
              <Link className={`guide-module guide-module--${module.tone}`} href={href} key={module.id}>
                <div className="guide-module__number"><span>{module.glyph}</span><i /></div>
                <div className="guide-module__body">
                  <small>{module.eyebrow}</small>
                  <h2>{module.title}</h2>
                  <p>{module.summary}</p>
                  <dl>
                    <div><dt>{stats?.sections ?? 13}</dt><dd>тем</dd></div>
                    <div><dt>{stats?.minutes ?? 50}</dt><dd>мин чтения</dd></div>
                    <div><dt>{stats?.words.toLocaleString("ru-RU") ?? "173K+"}</dt><dd>слов</dd></div>
                  </dl>
                </div>
                <span className="guide-module__arrow"><ArrowUpRight20Regular /></span>
              </Link>
            );
          })}
          <Link className="guide-module guide-module--appendix" href="/guide/appendix">
            <div className="guide-module__number"><span><DocumentBulletList24Regular /></span><i /></div>
            <div className="guide-module__body"><small>Дополнение PDF</small><h2>Быстрая карточка танка</h2><p>TL;DR, ниша в мете и архетип — компактная модель для решений на экране драфта.</p><dl><div><dt>{guideData.appendix.sections}</dt><dd>тем</dd></div><div><dt>{guideData.appendix.minutes}</dt><dd>мин чтения</dd></div><div><dt>{guideData.appendix.words.toLocaleString("ru-RU")}</dt><dd>слов</dd></div></dl></div>
            <span className="guide-module__arrow"><ArrowUpRight20Regular /></span>
          </Link>
        </div>
      </section>
    </main>
  );
}
