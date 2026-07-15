import type { Metadata } from "next";
import { LabTools } from "../components/lab-tools";

export const metadata: Metadata = { title: "Тренировочный полигон", description: "Интерактивные тренажёры решений, драфта, шотколлинга и позиционирования танка." };

export default function LabPage() {
  return <main id="main-content" className="page-shell lab-page"><section className="page-hero shell"><div className="eyebrow"><span>DECISION LAB</span><i /><em>4 TRAINING SYSTEMS</em></div><div className="page-hero__grid"><h1>ПОЛИГОН<br /><span>РЕШЕНИЙ</span></h1><div><p>Танк выигрывает не реакцией, а качеством решения до нажатия кнопки. Здесь теория превращается в короткий повторяемый протокол.</p><dl><div><dt>4</dt><dd>тренажёра</dd></div><div><dt>0 KB</dt><dd>тяжёлых движков</dd></div></dl></div></div></section><div className="shell"><LabTools /></div></main>;
}
