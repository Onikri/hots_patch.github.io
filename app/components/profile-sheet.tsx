"use client";

import { useEffect, useRef, useState } from "react";
import { Dismiss24Regular, Open24Regular } from "@/app/components/icons";

export function ProfileSheet({ heroName, src }: { heroName: string; src: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.body.classList.add("has-lightbox");
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => closeRef.current?.focus(), 20);
    return () => {
      document.body.classList.remove("has-lightbox");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button className="profile-sheet" type="button" onClick={() => setOpen(true)}>
        <img src={src} width="990" height="1400" alt={`Полная карточка характеристик героя ${heroName}`} />
        <span><b>Открыть карточку</b><small>Характеристики · способности · билды</small></span>
        <i><Open24Regular /></i>
      </button>
      {open ? (
        <div className="profile-lightbox" role="dialog" aria-modal="true" aria-label={`Карточка героя ${heroName}`} onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div className="profile-lightbox__window">
            <header><span><small>ORIGINAL PDF PROFILE</small><strong>{heroName}</strong></span><button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Закрыть карточку"><Dismiss24Regular /></button></header>
            <div><img src={src} width="990" height="1400" alt={`Развёрнутая карточка ${heroName}`} /></div>
          </div>
        </div>
      ) : null}
    </>
  );
}
