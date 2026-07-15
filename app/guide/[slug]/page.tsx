import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft20Regular, ArrowRight20Regular, ArrowUpRight20Regular, DocumentBulletList24Regular } from "@/app/components/icons";
import guideJson from "@/data/guide-content.json";
import { modules } from "@/data/catalog";
import { GuideRenderer, ReaderToc, type GuideBlock } from "@/app/components/guide-renderer";
import { assetPath } from "@/app/lib/asset-path";

type GuideModule = { id: number; title: string; words: number; minutes: number; sections: number; blocks: GuideBlock[] };
type Appendix = { title: string; words: number; minutes: number; sections: number; blocks: GuideBlock[] };
const guide = guideJson as unknown as { modules: GuideModule[]; appendix: Appendix };

export function generateStaticParams() {
  return [...modules.map((module) => ({ slug: module.slug })), { slug: "appendix" }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "appendix") return { title: guide.appendix.title };
  const meta = modules.find((module) => module.slug === slug);
  return meta ? { title: `Модуль ${meta.id}: ${meta.title}`, description: meta.summary } : {};
}

export default async function GuideModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const isAppendix = slug === "appendix";
  const meta = isAppendix ? null : modules.find((module) => module.slug === slug);
  if (!isAppendix && !meta) notFound();
  const content = isAppendix ? guide.appendix : guide.modules.find((item) => item.id === meta?.id);
  if (!content) notFound();

  const position = meta ? modules.findIndex((item) => item.id === meta.id) : modules.length;
  const previous = !isAppendix && position > 0 ? modules[position - 1] : null;
  const next = !isAppendix ? modules[position + 1] : null;

  return (
    <main id="main-content" className="article-page">
      <div className="reading-progress" aria-hidden="true" />
      <header className="article-hero shell">
        <nav className="breadcrumbs" aria-label="Хлебные крошки"><Link href="/guide">Гайд</Link><span>/</span><span>{isAppendix ? "Приложение" : `Модуль ${meta?.id}`}</span></nav>
        <div className="article-hero__grid">
          <div className="article-code"><span>{isAppendix ? <DocumentBulletList24Regular /> : String(meta?.id).padStart(2,"0")}</span><i /></div>
          <div>
            <div className="eyebrow"><span>{isAppendix ? "APPENDIX" : meta?.eyebrow}</span><i /><em>FULL TEXT</em></div>
            <h1>{isAppendix ? "Быстрая карточка танка" : meta?.title}</h1>
            <p>{isAppendix ? "Финальное приложение PDF: компактная модель TL;DR, ниши и архетипа для решений под таймер драфта." : meta?.summary}</p>
            <dl className="article-stats"><div><dt>{content.sections}</dt><dd>разделов</dd></div><div><dt>{content.words.toLocaleString("ru-RU")}</dt><dd>слов</dd></div><div><dt>{content.minutes}</dt><dd>минут чтения</dd></div></dl>
          </div>
        </div>
      </header>

      {meta?.id === 10 ? (
        <section className="draft-strip shell" aria-label="Архетипы драфта">
          <div><span>Визуальная матрица</span><p>Схемы из исходного гайда: открывай карточки перед разбором архетипов.</p></div>
          <div className="draft-strip__rail">
            {["balanced","dive","poke","burst","macro","rotation","late","wombo","pickoff","zoning"].map((name, index) => (
              <details className="draft-thumb" key={name}><summary><img src={assetPath(`/guide/drafts/${name}.jpg`)} width="1100" height="850" alt={`Схема драфта ${index + 1}`} loading="lazy" /><span>{String(index + 1).padStart(2,"0")}</span></summary><div className="draft-modal"><img src={assetPath(`/guide/drafts/${name}.jpg`)} width="1100" height="850" alt={`Полная схема драфта ${index + 1}`} /><small>Нажми вне карточки или на изображение, чтобы свернуть</small></div></details>
            ))}
          </div>
        </section>
      ) : null}

      <div className="reader-layout shell">
        <aside className="reader-meta">
          <div className="reader-meta__sticky">
            <span>Режим чтения</span>
            <p>Полный текст источника, очищенный только от переносов PDF.</p>
            <div className="reader-meta__signal"><i /><span>CONTENT<br /><b>VERIFIED</b></span></div>
            <Link href="/sources">Методология <ArrowUpRight20Regular /></Link>
          </div>
        </aside>
        <article className="reader-article">
          <GuideRenderer blocks={content.blocks} />
          {meta?.id === 11 ? <Link className="reader-roster-cta" href="/heroes"><span>MODULE 11</span><strong>Перейти к 13 профилям героев</strong><i><ArrowUpRight20Regular /></i></Link> : null}
          <nav className="article-pagination" aria-label="Соседние модули">
            {previous ? <Link href={previous.id === 11 ? "/heroes" : `/guide/${previous.slug}`}><span><ArrowLeft20Regular /> Назад</span><strong>{previous.title}</strong></Link> : <i />}
            {next ? <Link href={next.id === 11 ? "/heroes" : `/guide/${next.slug}`}><span>Дальше <ArrowRight20Regular /></span><strong>{next.title}</strong></Link> : <Link href="/guide/appendix"><span>Приложение <ArrowRight20Regular /></span><strong>Быстрая карточка танка</strong></Link>}
          </nav>
        </article>
        <aside className="reader-nav"><div className="reader-nav__sticky"><ReaderToc blocks={content.blocks} /></div></aside>
      </div>
    </main>
  );
}
