import type { ReactNode } from "react";
import { Link16Regular } from "@/app/components/icons";

export type GuideBlock = {
  type: "module" | "section" | "subheading" | "paragraph" | "bullet" | "number";
  text: string;
};

export function anchorFor(text: string, index: number) {
  const normalized = text
    .toLocaleLowerCase("ru")
    .replace(/^\d+[.,]\d+[.|,]?\s*/, "")
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54);
  return `${normalized || "section"}-${index}`;
}

function renderLead(text: string): ReactNode {
  const match = text.match(/^((?:Пример|Важно|Правило|Суть прокаста|Суть связки|Берем мгновенно, если|Лучше воздержаться, если|Подытоживая|Задача|Цель|Ошибка \d+|Фишка \d+)[^:]{0,80}:)\s*(.*)$/i);
  if (!match) return text;
  return <><strong>{match[1]}</strong> {match[2]}</>;
}

export function GuideRenderer({ blocks }: { blocks: GuideBlock[] }) {
  const result: ReactNode[] = [];
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];
    if (block.type === "module") {
      index += 1;
      continue;
    }
    if (block.type === "bullet" || block.type === "number") {
      const type = block.type;
      const items: GuideBlock[] = [];
      while (blocks[index]?.type === type) {
        items.push(blocks[index]);
        index += 1;
      }
      const Tag = type === "bullet" ? "ul" : "ol";
      result.push(
        <Tag className={`reader-list reader-list--${type}`} key={`list-${index}`}>
          {items.map((item, itemIndex) => <li key={`${index}-${itemIndex}`}>{renderLead(item.text)}</li>)}
        </Tag>,
      );
      continue;
    }
    if (block.type === "section") {
      const id = anchorFor(block.text, index);
      result.push(<h2 id={id} key={id}>{block.text}<a href={`#${id}`} aria-label={`Ссылка на раздел ${block.text}`}><Link16Regular /></a></h2>);
    } else if (block.type === "subheading") {
      result.push(<h3 key={`sub-${index}`}>{block.text}</h3>);
    } else {
      result.push(<p key={`p-${index}`}>{renderLead(block.text)}</p>);
    }
    index += 1;
  }

  return <div className="reader-content">{result}</div>;
}

export function ReaderToc({ blocks }: { blocks: GuideBlock[] }) {
  const sections = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.type === "section");
  if (!sections.length) return null;
  return (
    <nav className="reader-toc" aria-label="Содержание страницы">
      <span>В этом разделе</span>
      {sections.map(({ block, index }) => (
        <a href={`#${anchorFor(block.text, index)}`} key={`${block.text}-${index}`}>{block.text.replace(/^\d+[.,]\d+[.|,]?\s*/, "")}</a>
      ))}
    </nav>
  );
}
