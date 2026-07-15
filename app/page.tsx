import Link from "next/link";
import {
  ArrowUpRight24Regular,
  ChevronRight20Regular,
  Eye24Regular,
  Megaphone24Regular,
  Open20Regular,
  Shield24Regular,
  Sparkle12Filled,
} from "@/app/components/icons";
import { LiquidHeroVisual } from "./components/liquid-hero";
import { assetPath } from "./lib/asset-path";
import { heroes, modules } from "@/data/catalog";

const featured = heroes.filter((hero) => ["johanna", "garrosh", "tyrael", "anubarak"].includes(hero.slug));

export default function Home() {
  return (
    <main id="main-content">
      <section className="hero shell">
        <div className="hero__copy">
          <div className="eyebrow"><span>FIELD MANUAL</span><i /> <em>HOTs · TANK / MT</em></div>
          <h1>
            НЕ ВПИТЫВАЙ.<br />
            <span>УПРАВЛЯЙ</span> ПОЛЕМ.
          </h1>
          <p className="hero__lead">
            Полная операционная система мейн-танка: от первого куста до последнего колла на кору. 657 страниц исходного гайда — без сокращения смысла, с интерактивной навигацией и отдельным досье на каждого героя.
          </p>
          <div className="hero__actions">
            <Link className="button button--primary" href="/guide">Открыть полный гайд <ArrowUpRight24Regular /></Link>
            <Link className="button button--ghost" href="/heroes">Выбрать танка <span>13</span></Link>
          </div>
          <dl className="hero__stats">
            <div><dt>657</dt><dd>страниц</dd></div>
            <div><dt>226K+</dt><dd>слов</dd></div>
            <div><dt>13</dt><dd>танков</dd></div>
            <div><dt>116</dt><dd>тем базы</dd></div>
          </dl>
        </div>
        <div className="hero__visual">
          <LiquidHeroVisual />
        </div>
        <a className="scroll-cue" href="#doctrine"><span>Прокрутить</span><i /></a>
      </section>

      <section className="signal-bar" aria-label="Ключевой принцип">
        <div className="signal-bar__track">
          <span>ТАНК — ЭТО СТЕРЖЕНЬ КОМАНДЫ</span><i><Sparkle12Filled /></i><span>ВИЖЕН РАНЬШЕ УРОНА</span><i><Sparkle12Filled /></i><span>ПОЗИЦИЯ РАНЬШЕ КНОПКИ</span><i><Sparkle12Filled /></i><span>КОЛЛ РАНЬШЕ ХАОСА</span><i><Sparkle12Filled /></i>
          <span aria-hidden="true">ТАНК — ЭТО СТЕРЖЕНЬ КОМАНДЫ</span><i aria-hidden="true"><Sparkle12Filled /></i><span aria-hidden="true">ВИЖЕН РАНЬШЕ УРОНА</span>
        </div>
      </section>

      <section className="section shell" id="doctrine">
        <div className="section-head">
          <div><span className="section-index">01 / ДОКТРИНА</span><h2>Три системы<br />одной роли.</h2></div>
          <p>Сильный танк не ищет цифры в Tab. Он последовательно контролирует пространство, информацию и право начать или закончить драку.</p>
        </div>
        <div className="doctrine-grid">
          <article className="doctrine-card doctrine-card--space">
            <div className="doctrine-card__top"><span>01</span><i><Shield24Regular /></i></div>
            <h3>SPACE</h3><strong>Создай зелёную зону</strong>
            <p>Займи угол, куст или чоук так, чтобы бэклайн мог двигаться вперёд, а враг — только назад.</p>
            <div className="space-diagram" aria-hidden="true"><i /><i /><b>MT</b><span>BACKLINE</span></div>
          </article>
          <article className="doctrine-card doctrine-card--vision">
            <div className="doctrine-card__top"><span>02</span><i><Eye24Regular /></i></div>
            <h3>VISION</h3><strong>Стань живым радаром</strong>
            <p>Читай пропавших героев, волны и ротации. Проверяй опасность инструментом — не лицом.</p>
            <div className="radar-diagram" aria-hidden="true"><i /><i /><i /><b /></div>
          </article>
          <article className="doctrine-card doctrine-card--tempo">
            <div className="doctrine-card__top"><span>03</span><i><Megaphone24Regular /></i></div>
            <h3>TEMPO</h3><strong>Дай короткий колл</strong>
            <p>Одна цель. Одно действие. Один тайминг: «не дерёмся», «разворот», «босс 5 секунд».</p>
            <div className="tempo-diagram" aria-hidden="true"><span>HOLD</span><span>GO</span><span>RESET</span></div>
          </article>
        </div>
      </section>

      <section className="section section--modules">
        <div className="shell">
          <div className="section-head section-head--compact">
            <div><span className="section-index">02 / СИСТЕМА</span><h2>Маршрут от базы<br />до шотколлера.</h2></div>
            <Link className="text-link" href="/guide">Все модули <ArrowUpRight24Regular /></Link>
          </div>
          <div className="module-rail">
            {modules.slice(0, 11).map((module) => (
              <Link className={`module-tile module-tile--${module.tone}`} href={`/guide/${module.slug}`} key={module.id}>
                <span className="module-tile__id">{module.glyph}</span>
                <div><small>{module.eyebrow}</small><h3>{module.title}</h3><p>{module.summary}</p></div>
                <i><ChevronRight20Regular /></i>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-head">
          <div><span className="section-index">03 / РОСТЕР</span><h2>Инструмент<br />под конкретную задачу.</h2></div>
          <p>«Просто танка» не существует. Сначала читаешь карту и драфт — потом выбираешь форму контроля.</p>
        </div>
        <div className="featured-roster">
          {featured.map((hero, index) => (
            <Link className="featured-hero" href={`/heroes/${hero.slug}`} key={hero.slug} style={{ "--hero-accent": hero.accent } as React.CSSProperties}>
              <div className="featured-hero__image"><img src={assetPath(`/heroes/${hero.slug}-thumb.jpg`)} width="520" height="736" alt={`Карточка героя ${hero.name}`} loading={index > 1 ? "lazy" : "eager"} /></div>
              <div className="featured-hero__body">
                <span>{hero.universe} · {hero.archetype}</span>
                <h3>{hero.name}</h3>
                <p>{hero.summary}</p>
                <div>{hero.tags.map((tag) => <small key={tag}>{tag}</small>)}</div>
              </div>
              <i><Open20Regular /></i>
            </Link>
          ))}
        </div>
        <div className="section-cta"><Link className="button button--ghost" href="/heroes">Смотреть все 13 досье <ArrowUpRight24Regular /></Link></div>
      </section>

      <section className="section shell field-cta">
        <div className="field-cta__grid" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div className="field-cta__content">
          <span className="section-index">04 / ПОЛИГОН</span>
          <h2>Знание не работает,<br />пока не стало решением.</h2>
          <p>Проверь зелёный свет для драки, подбери танка под угрозу, отрепетируй короткий колл и почувствуй геометрию threat range.</p>
          <Link className="button button--primary" href="/lab">Запустить тренажёры <ArrowUpRight24Regular /></Link>
        </div>
        <div className="field-cta__readout" aria-hidden="true"><span>DECISION ENGINE</span><b>READY</b><i>98.4</i></div>
      </section>
    </main>
  );
}
