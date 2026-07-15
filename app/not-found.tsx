import Link from "next/link";
import { ArrowUpRight24Regular } from "@/app/components/icons";

export default function NotFound() {
  return <main id="main-content" className="not-found shell"><span>404 / FOG OF WAR</span><h1>Цель пропала<br />с миникарты.</h1><p>Такой страницы нет. Вернись к карте гайда или открой ростер танков.</p><div><Link className="button button--primary" href="/guide">К модулям <ArrowUpRight24Regular /></Link><Link className="button button--ghost" href="/heroes">К танкам <ArrowUpRight24Regular /></Link></div></main>;
}
