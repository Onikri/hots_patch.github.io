import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppsListDetail20Regular, ArrowLeft20Regular, ArrowRight20Regular, ArrowUpRight20Regular } from "@/app/components/icons";
import guideJson from "@/data/guide-content.json";
import heroVisualJson from "@/data/hero-visuals.json";
import { heroes } from "@/data/catalog";
import { GuideRenderer, ReaderToc, type GuideBlock } from "@/app/components/guide-renderer";
import { HeroVisualAtlas, type HeroVisualGroups } from "@/app/components/hero-visual-atlas";
import { ProfileSheet } from "@/app/components/profile-sheet";
import { assetPath } from "@/app/lib/asset-path";

type HeroContent = { slug: string; name: string; words: number; minutes: number; sections: number; startPage: number; endPage: number; blocks: GuideBlock[] };
const guide = guideJson as unknown as { heroes: HeroContent[] };
const heroVisuals = heroVisualJson as Record<string, HeroVisualGroups>;

export function generateStaticParams() { return heroes.map((hero) => ({ slug: hero.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const hero = heroes.find((item) => item.slug === slug);
  return hero ? { title: hero.name, description: `${hero.summary} Полный профиль, билды, карты и контрпики.` } : {};
}

function Meter({ label, value }: { label: string; value: number }) {
  return <div className="hero-meter"><span>{label}</span><i>{Array.from({ length: 5 }, (_, index) => <b className={index < value ? "is-on" : ""} key={index} />)}</i></div>;
}

export default async function HeroPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hero = heroes.find((item) => item.slug === slug);
  const content = guide.heroes.find((item) => item.slug === slug);
  if (!hero || !content) notFound();
  const index = heroes.findIndex((item) => item.slug === slug);
  const previous = heroes[(index - 1 + heroes.length) % heroes.length];
  const next = heroes[(index + 1) % heroes.length];
  const visuals = heroVisuals[hero.slug];
  const visualCount = Object.values(visuals).reduce((sum, items) => sum + items.length, 0);

  return (
    <main id="main-content" className="article-page hero-profile" style={{ "--hero-accent": hero.accent } as React.CSSProperties}>
      <div className="reading-progress" aria-hidden="true" />
      <header className="hero-dossier shell">
        <nav className="breadcrumbs" aria-label="Хлебные крошки"><Link href="/heroes">Танки</Link><span>/</span><span>{hero.name}</span></nav>
        <div className="hero-dossier__grid">
          <div className="hero-dossier__copy">
            <div className="eyebrow"><span>HERO DOSSIER</span><i /><em>{hero.universe}</em></div>
            <h1>{hero.name}</h1><strong>{hero.alias}</strong>
            <p>{hero.summary}</p>
            <div className="hero-tags">{hero.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <div className="hero-meters"><Meter label="Сложность" value={hero.difficulty} /><Meter label="Инициация" value={hero.engage} /><Meter label="Пилинг" value={hero.peel} /><Meter label="Макро" value={hero.macro} /></div>
            <a className="visual-atlas-jump" href="#visual-atlas"><AppsListDetail20Regular /><span>Открыть визуальные карточки</span><small>{visualCount}</small></a>
          </div>
          <ProfileSheet heroName={hero.name} src={assetPath(`/heroes/${hero.slug}-profile.jpg`)} />
        </div>
        <div className="hero-briefs">
          <article><span>INSTALOCK / когда брать</span><p>{hero.pick}</p></article>
          <article><span>DODGE / красный флаг</span><p>{hero.caution}</p></article>
          <dl><div><dt>{content.sections}</dt><dd>разделов</dd></div><div><dt>{content.words.toLocaleString("ru-RU")}</dt><dd>слов</dd></div><div><dt>{content.minutes}</dt><dd>мин чтения</dd></div><div><dt>{content.startPage}—{content.endPage}</dt><dd>страницы PDF</dd></div></dl>
        </div>
      </header>
      <HeroVisualAtlas heroName={hero.name} groups={visuals} />
      <div className="reader-layout shell">
        <aside className="reader-meta"><div className="reader-meta__sticky"><span>{hero.archetype}</span><p>Статичные цифры могут измениться с патчем. Принципы, условия пика и геометрия боя размечены отдельно.</p><div className="reader-meta__signal"><i /><span>PROFILE<br /><b>FULL</b></span></div><Link href="/sources#patch">Проверить патч <ArrowUpRight20Regular /></Link></div></aside>
        <article className="reader-article"><GuideRenderer blocks={content.blocks} /><nav className="article-pagination article-pagination--heroes"><Link href={`/heroes/${previous.slug}`}><span><ArrowLeft20Regular /> Предыдущий</span><strong>{previous.name}</strong></Link><Link href={`/heroes/${next.slug}`}><span>Следующий <ArrowRight20Regular /></span><strong>{next.name}</strong></Link></nav></article>
        <aside className="reader-nav"><div className="reader-nav__sticky"><ReaderToc blocks={content.blocks} /></div></aside>
      </div>
    </main>
  );
}
