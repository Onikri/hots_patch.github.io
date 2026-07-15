"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight20Regular, Checkmark16Regular, ChevronRight20Regular } from "@/app/components/icons";

const signals = [
  { id: "team", label: "Команда в радиусе follow-up", hint: "Урон и хил реально успевают к твоему контролю.", weight: 24 },
  { id: "talent", label: "Нет дефицита талантов", hint: "Уровни равны или преимущество на вашей стороне.", weight: 20 },
  { id: "cooldowns", label: "Главный engage готов", hint: "Есть стартовая кнопка и план выхода после ответа.", weight: 18 },
  { id: "vision", label: "Позиции врага прочитаны", hint: "Нет двух пропавших героев, которые заходят во фланг.", weight: 16 },
  { id: "resources", label: "HP и мана выше порога", hint: "Танк не начинает драку с пустым ресурсом.", weight: 12 },
  { id: "escape", label: "Ключевой эскейп врага потрачен", hint: "Цель не может бесплатно отменить твой commit.", weight: 10 },
];

const draftCases = {
  mages: { title: "Двойной магический burst", heroes: ["Ануб'арак", "Диабло", "Мурадин"], note: "Ануб — профильный ответ через spell armor и Кокон. Диабло и Мурадин — запасные универсалы, если геометрия или пул не подходят." },
  auto: { title: "Два автоатакера", heroes: ["Джоанна", "Мэй", "Артас"], note: "Слепота Джоанны и Мэй режет окно урона; Артас особенно силён, если автоатакеры вынуждены играть в мили." },
  dive: { title: "Мобильный дайв", heroes: ["Вариан", "Гаррош", "Е.Т.С."], note: "Таргетная Провокация, бросок или мгновенный counter-engage надёжнее медленного зонального контроля." },
  static: { title: "Статичный бэклайн", heroes: ["Стежок", "Диабло", "Ануб'арак"], note: "Наказывай неподвижную позицию дальним pick-off, стеной или входом через текстуру." },
  objective: { title: "Долгая драка за точку", heroes: ["Мэй", "Блейз", "Артас"], note: "Здесь выигрывает не первый стан, а управление зоной, ресурсы и способность пережить повторный контакт." },
  solo: { title: "Соло-Q без надёжного follow-up", heroes: ["Джоанна", "Мурадин", "Мэй"], note: "Низкий commit, самостоятельная выживаемость и вейвклир обычно ценнее идеальной, но командозависимой синергии." },
} as const;

const callScenarios = [
  { situation: "До объекта 18 секунд. Вы на таланте 16, соперник — на 15. Кемп уже идёт по дальней линии.", bad: "Ребят, наверное, можно что-то сделать…", call: "Талант наш. Сразу объект. Не гонимся." },
  { situation: "Вражеский танк показался на верхней линии. Босс рядом с вашей четвёркой, но убийства нет.", bad: "Может, босс? Хотя не знаю, опасно.", call: "Танк топ. Босс сейчас. Пять секунд — потом выход." },
  { situation: "Ваш маг потратил ульт, хилер на 35% маны, враг медленно идёт вперёд.", bad: "Отходим, отходим, отходим, почему вы не идёте?", call: "Ресетов нет. Назад до форта. Не разворачиваемся." },
  { situation: "Дайвер соперника прыгнул в вашего хила и потратил эскейп. Вражеский бэклайн далеко.", bad: "Бейте кого-нибудь сзади!", call: "Гендзи без выхода. Разворот в Гендзи. Всё в него." },
  { situation: "Вы взяли объект, но два союзника ниже половины HP, а враги только что ожили.", bad: "Пушим до конца, у нас же объект!", call: "Один форт — и выходим. Без дайва. Тап после форта." },
];

export function LabTools() {
  const [active, setActive] = useState<string[]>(["team", "cooldowns", "resources"]);
  const [draft, setDraft] = useState<keyof typeof draftCases>("mages");
  const [callIndex, setCallIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [spacing, setSpacing] = useState(52);
  const [threat, setThreat] = useState(67);
  const score = useMemo(() => signals.filter((signal) => active.includes(signal.id)).reduce((sum, signal) => sum + signal.weight, 0), [active]);
  const state = score >= 78 ? "green" : score >= 52 ? "amber" : "red";
  const verdict = state === "green" ? "ЗЕЛЁНЫЙ СВЕТ" : state === "amber" ? "НУЖЕН ЕЩЁ ОДИН СИГНАЛ" : "КРАСНЫЙ СВЕТ";

  const toggle = (id: string) => setActive((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  const nextCall = () => { setCallIndex((value) => (value + 1) % callScenarios.length); setRevealed(false); };

  return (
    <div className="lab-stack">
      <section className="lab-panel lab-panel--signal">
        <header><div><span>01 / FIGHT CHECK</span><h2>Можно ли драться?</h2></div><div className={`decision-light decision-light--${state}`}><i /><strong>{score}</strong><small>/ 100</small></div></header>
        <div className="signal-console">
          <div className="signal-list">
            {signals.map((signal) => (
              <button className={active.includes(signal.id) ? "is-on" : ""} type="button" onClick={() => toggle(signal.id)} key={signal.id} aria-pressed={active.includes(signal.id)}>
                <i>{active.includes(signal.id) ? <Checkmark16Regular /> : null}</i><span><strong>{signal.label}</strong><small>{signal.hint}</small></span><em>+{signal.weight}</em>
              </button>
            ))}
          </div>
          <div className={`verdict verdict--${state}`}><span>РЕШЕНИЕ</span><strong>{verdict}</strong><p>{state === "green" ? "Назови цель и действие. Входи только если команда услышала колл." : state === "amber" ? "Подожди кулдаун, позицию или ещё одну информацию. Не превращай сомнение в commit." : "Сбрось темп, удерживай проход и сохрани HP. Плохую драку не обязаны принимать."}</p><div><i style={{ width: `${score}%` }} /></div></div>
        </div>
      </section>

      <section className="lab-panel">
        <header><div><span>02 / DRAFT DECODER</span><h2>Что нужно драфту?</h2></div><p>Не тир-лист. Быстрый перевод угрозы противника в нужный архетип.</p></header>
        <div className="draft-console">
          <div className="draft-case-list" role="tablist" aria-label="Сценарий драфта">
            {(Object.keys(draftCases) as Array<keyof typeof draftCases>).map((key) => <button className={draft === key ? "is-active" : ""} type="button" role="tab" aria-selected={draft === key} onClick={() => setDraft(key)} key={key}>{draftCases[key].title}<i><ChevronRight20Regular /></i></button>)}
          </div>
          <div className="draft-result" role="tabpanel"><span>РЕКОМЕНДУЕМЫЙ ПУЛ</span><div>{draftCases[draft].heroes.map((name, index) => { const slug = ({"Ануб'арак":"anubarak","Диабло":"diablo","Мурадин":"muradin","Джоанна":"johanna","Мэй":"mei","Артас":"arthas","Вариан":"varian","Гаррош":"garrosh","Е.Т.С.":"etc","Стежок":"stitches","Блейз":"blaze"} as Record<string,string>)[name]; return <Link href={`/heroes/${slug}`} key={name}><small>0{index + 1}</small><strong>{name}</strong><i><ArrowRight20Regular /></i></Link>; })}</div><p>{draftCases[draft].note}</p><em>Финальный выбор всё равно зависит от карты, своего пула и кнопок союзников.</em></div>
        </div>
      </section>

      <section className="lab-grid-two">
        <article className="lab-panel call-trainer">
          <header><div><span>03 / COMMS</span><h2>Колл за три секунды</h2></div><small>{String(callIndex + 1).padStart(2,"0")} / {String(callScenarios.length).padStart(2,"0")}</small></header>
          <div className="scenario"><span>СИТУАЦИЯ</span><p>{callScenarios[callIndex].situation}</p></div>
          <div className={`call-answer ${revealed ? "is-revealed" : ""}`}><span>{revealed ? "КОРОТКИЙ КОЛЛ" : "СФОРМУЛИРУЙ САМ"}</span><strong>{revealed ? callScenarios[callIndex].call : "Цель · действие · тайминг"}</strong>{revealed ? <small>Шумный вариант: «{callScenarios[callIndex].bad}»</small> : null}</div>
          <div className="call-actions"><button type="button" onClick={() => setRevealed((value) => !value)}>{revealed ? "Скрыть ответ" : "Показать колл"}</button><button type="button" onClick={nextCall}>Следующая ситуация <ArrowRight20Regular /></button></div>
        </article>

        <article className="lab-panel geometry-lab" style={{ "--spacing": `${spacing}%`, "--threat": `${threat}%` } as React.CSSProperties}>
          <header><div><span>04 / GEOMETRY</span><h2>Threat range</h2></div><small>LIVE MODEL</small></header>
          <div className="geometry-field" aria-label="Схема дистанции танка"><div className="geometry-threat"><i /></div><div className="unit unit--tank">MT</div><div className="unit unit--backline">DD</div><div className="unit unit--enemy">EN</div><span className="distance-line" /><em>SAFE SPACE</em></div>
          <label><span>Дистанция до бэклайна <b>{spacing}</b></span><input type="range" min="24" max="82" value={spacing} onChange={(event) => setSpacing(Number(event.target.value))} /></label>
          <label><span>Зона угрозы <b>{threat}</b></span><input type="range" min="35" max="92" value={threat} onChange={(event) => setThreat(Number(event.target.value))} /></label>
          <p>{spacing > threat ? "Ты отрезан: команда не успеет в твой контроль." : spacing < 38 ? "Слишком плотно: один массовый контроль зацепит весь строй." : "Рабочая дистанция: фронт угрожает входом, бэклайн сохраняет follow-up."}</p>
        </article>
      </section>
    </div>
  );
}
