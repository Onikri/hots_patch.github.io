"use client";

import type { CSSProperties, PointerEvent } from "react";
import {
  BookOpen24Regular,
  Eye24Regular,
  ShieldCheckmark24Filled,
  Timer24Regular,
} from "@/app/components/icons";

export function LiquidHeroVisual() {
  const updateLight = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    event.currentTarget.style.setProperty("--light-x", `${x}%`);
    event.currentTarget.style.setProperty("--light-y", `${y}%`);
  };

  const resetLight = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--light-x", "68%");
    event.currentTarget.style.setProperty("--light-y", "18%");
  };

  return (
    <div
      className="liquid-scene"
      style={{ "--light-x": "68%", "--light-y": "18%" } as CSSProperties}
      onPointerMove={updateLight}
      onPointerLeave={resetLight}
      role="img"
      aria-label="Интерактивная схема системы танка"
    >
      <div className="liquid-scene__wallpaper" aria-hidden="true"><i /><i /><i /></div>
      <div className="morph-pane morph-pane--primary">
        <div className="morph-pane__shine" aria-hidden="true" />
        <header><ShieldCheckmark24Filled /><span>FIELD SYSTEM</span><small>ONLINE</small></header>
        <strong>ТАНК</strong>
        <p>Контроль пространства, информации и момента входа.</p>
        <div className="morph-pane__meter"><span /><span /><span /><span /><span /></div>
      </div>
      <div className="glass-chip glass-chip--vision"><Eye24Regular /><span><small>VISION</small><b>Читать карту</b></span></div>
      <div className="glass-chip glass-chip--tempo"><Timer24Regular /><span><small>TEMPO</small><b>Диктовать окно</b></span></div>
      <div className="glass-chip glass-chip--guide"><BookOpen24Regular /><span><small>657 PAGES</small><b>Полная база</b></span></div>
      <span className="liquid-scene__caption">MICA / ACRYLIC / LIQUID GLASS</span>
    </div>
  );
}
