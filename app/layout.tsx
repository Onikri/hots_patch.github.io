import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Navigation24Regular, ShieldCheckmark24Filled } from "@/app/components/icons";
import { GlobalSearch } from "./components/global-search";
import { assetPath } from "./lib/asset-path";
import { searchEntries } from "@/data/catalog";
import "@fluentui/react-icons/headless/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ТАНК — полевой гайд по Heroes of the Storm",
    template: "%s — ТАНК",
  },
  description:
    "657 страниц практики мейн-танка: макро, вижен, шотколлинг, драфт и 13 полных профилей героев Heroes of the Storm.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: assetPath("/favicon.svg"),
    shortcut: assetPath("/favicon.svg"),
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#101322",
  width: "device-width",
  initialScale: 1,
};

function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner shell">
        <Link className="brand" href="/" aria-label="ТАНК — на главную">
          <span className="brand__mark" aria-hidden="true">
            <ShieldCheckmark24Filled />
          </span>
          <span className="brand__text">ТАНК</span>
          <span className="brand__edition">FIELD GUIDE / 1.0</span>
        </Link>

        <nav className="desktop-nav" aria-label="Основная навигация">
          <Link href="/guide">Гайд</Link>
          <Link href="/heroes">Танки</Link>
          <Link href="/lab">Полигон</Link>
          <Link href="/sources">Источники</Link>
        </nav>

        <div className="header-actions">
          <GlobalSearch entries={searchEntries} />
          <details className="mobile-nav">
            <summary aria-label="Открыть меню"><Navigation24Regular /></summary>
            <nav aria-label="Мобильная навигация">
              <Link href="/guide">Полный гайд</Link>
              <Link href="/heroes">13 танков</Link>
              <Link href="/lab">Полигон</Link>
              <Link href="/sources">Источники</Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Link className="brand brand--footer" href="/">
            <span className="brand__mark" aria-hidden="true"><ShieldCheckmark24Filled /></span>
            <span className="brand__text">ТАНК</span>
          </Link>
          <p className="footer-note">
            Неофициальный образовательный проект по Heroes of the Storm. Материалы игры и названия принадлежат Blizzard Entertainment.
          </p>
        </div>
        <div className="footer-links">
          <div>
            <span>Изучать</span>
            <Link href="/guide">Модули</Link>
            <Link href="/heroes">Ростер</Link>
            <Link href="/lab">Практика</Link>
          </div>
          <div>
            <span>О проекте</span>
            <Link href="/sources">Методология</Link>
            <Link href="/sources#patch">Статус патча</Link>
            <Link href="/guide/appendix">Приложение</Link>
          </div>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>657 страниц · 226 000+ слов · 13 героев</span>
        <span>Собрано для тех, кто идёт первым.</span>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <a className="skip-link" href="#main-content">Перейти к содержанию</a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
