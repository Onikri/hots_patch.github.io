(function () {
  "use strict";

  var BASE = "/hots_tank.github.io";
  var STORAGE_KEY = "tank-field-guide:mechanics:v1";
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var readerSession = null;
  var labSession = null;
  var bootQueued = false;

  function asset(path) {
    return BASE + path;
  }

  function avatar(hero) {
    var avatarAliases = {
      valla: "demonhunter",
      blaze: "firebat",
      etc: "l90etc",
      mei: "meiow",
    };
    var assetHero = avatarAliases[hero] || hero;
    return asset(
      "/asset-library/assets/asset_library/hots/heroes/avatars/" +
        "storm_ui_glues_draft_portrait_" +
        assetHero +
        ".png",
    );
  }

  function statusIcon(name) {
    return asset(
      "/asset-library/assets/card_studio/static/wiki_status_icons/" +
        name +
        ".png",
    );
  }

  function talentIcon(name) {
    return asset(
      "/asset-library/assets/asset_library/hots/heroes/talents/" + name,
    );
  }

  var ABILITIES = {
    muradin: asset("/lab/game-assets/abilities/muradin-q-stormbolt.png"),
    anubarak: asset("/lab/game-assets/abilities/anubarak-q-impale.png"),
    diablo: asset("/lab/game-assets/abilities/diablo-q-shadow-charge.png"),
    garrosh: asset("/lab/game-assets/abilities/garrosh-e-wrecking-ball.png"),
    mosh: asset("/lab/game-assets/abilities/etc-r-mosh-pit.png"),
    salvation: asset("/lab/game-assets/abilities/anduin-r-salvation.png"),
    ironSkin: asset("/lab/game-assets/abilities/johanna-d-iron-skin.png"),
    swiftStrike: asset("/lab/game-assets/abilities/genji-e-swift-strike.png"),
  };

  var HERO_NAMES = {
    anduin: "Андуин",
    anubarak: "Ануб'арак",
    arthas: "Артас",
    blaze: "Блэйз",
    diablo: "Диабло",
    etc: "E.T.C.",
    garrosh: "Гаррош",
    genji: "Гэндзи",
    johanna: "Джоанна",
    l90etc: "E.T.C.",
    malganis: "Мал'Ганис",
    mei: "Мэй",
    muradin: "Мурадин",
    stitches: "Стежок",
    tyrael: "Тираэль",
    varian: "Вариан",
    valla: "Валла",
  };

  var TANK_ROSTER = {
    muradin: {
      id: "muradin",
      name: "Мурадин",
      speed: 4.8398,
      radius: 0.8125,
      abilities: [
        {
          key: "q",
          name: "Грозовой молот",
          icon: talentIcon("storm_ui_icon_muradin_stormbolt.png"),
          shape: "line",
          range: 8.5,
          width: 1.25,
          castDelay: 0.15,
          projectileSpeed: 25,
          outcome: "stun",
          effect: "Первая цель по линии получает оглушение.",
        },
        {
          key: "w",
          name: "Раскат грома",
          icon: talentIcon("storm_ui_icon_muradin_thunderclap.png"),
          shape: "self",
          range: 3,
          castDelay: 0.15,
          outcome: "slow",
          effect: "Задевает врагов вокруг Мурадина и замедляет их.",
        },
        {
          key: "e",
          name: "Дворфийский прыжок",
          icon: talentIcon("storm_ui_icon_muradin_dwarftoss.png"),
          shape: "area",
          range: 8,
          radius: 2,
          castDelay: 0.2,
          outcome: "leap",
          effect: "Прыжок в указанную точку с областью приземления.",
        },
        {
          key: "r",
          name: "Ошеломляющий удар",
          icon: talentIcon("storm_ui_icon_muradin_haymaker.png"),
          shape: "target",
          range: 1,
          castDelay: 0.1,
          outcome: "knockback",
          effect: "Выбирает ближнюю цель и отбрасывает её.",
        },
      ],
    },
    anubarak: {
      id: "anubarak",
      name: "Ануб'арак",
      speed: 4.8398,
      radius: 1.0625,
      abilities: [
        {
          key: "q",
          name: "Пронзание",
          icon: talentIcon("storm_ui_icon_anubarak_impale.png"),
          shape: "line",
          range: 11.5,
          width: 1.5,
          castDelay: 0.25,
          pierces: true,
          outcome: "knockup",
          effect: "Линия шипов с задержкой подбрасывает цели.",
        },
        {
          key: "w",
          name: "Укреплённый панцирь",
          icon: talentIcon("storm_ui_icon_anubarak_hardencarapace_var1.png"),
          shape: "self",
          range: 0,
          castDelay: 0,
          defensive: true,
          outcome: "shield",
          timingWindow: 0.42,
          effect: "Self-cast: нажми W в подсвеченное окно перед попаданием снаряда.",
        },
        {
          key: "e",
          name: "Подземный рывок",
          icon: talentIcon("storm_ui_icon_anubarak_burrowcharge.png"),
          shape: "area",
          range: 12.25,
          radius: 1.75,
          castDelay: 0.0625,
          outcome: "burrow",
          effect: "Рывок к точке с подбрасыванием в зоне финиша.",
        },
        {
          key: "r",
          name: "Кокон",
          icon: talentIcon("storm_ui_icon_anubarak_webblast.png"),
          shape: "target",
          range: 6,
          castDelay: 0.2,
          outcome: "cocoon",
          effect: "Выбирает одну важную вражескую цель.",
        },
      ],
    },
    diablo: {
      id: "diablo",
      name: "Диабло",
      speed: 4.8398,
      radius: 1.1875,
      abilities: [
        {
          key: "q",
          name: "Натиск Тени",
          icon: talentIcon("storm_ui_icon_diablo_shadowcharge_var1.png"),
          shape: "target",
          range: 7,
          castDelay: 0,
          wall: true,
          outcome: "charge",
          effect: "Рывок к цели; золотая зона у стены даёт оглушение.",
        },
        {
          key: "w",
          name: "Огненный топот",
          icon: talentIcon("storm_ui_icon_diablo_firestomp.png"),
          shape: "cone",
          range: 11.25,
          angle: 70,
          castDelay: 0.2,
          outcome: "burn",
          effect: "Направь веер огня так, чтобы приоритет попал в центр.",
        },
        {
          key: "e",
          name: "Сверхсила",
          icon: talentIcon("storm_ui_icon_diablo_overpower_var1.png"),
          shape: "target",
          range: 1,
          castDelay: 0.0625,
          outcome: "flip",
          effect: "Ближний захват перебрасывает цель за Диабло.",
        },
        {
          key: "r",
          name: "Электрическое дыхание",
          icon: talentIcon("storm_ui_icon_diablo_lightningbreath.png"),
          shape: "cone",
          range: 12.5,
          angle: 40,
          castDelay: 0.2,
          outcome: "channel",
          effect: "Длинный конус урона и замедления.",
        },
      ],
    },
    garrosh: {
      id: "garrosh",
      name: "Гаррош",
      speed: 4.8398,
      radius: 0.875,
      abilities: [
        {
          key: "q",
          name: "Землелом",
          icon: talentIcon("storm_ui_icon_garrosh_groundbreaker.png"),
          shape: "cone",
          range: 7.25,
          minimumRange: 6.25,
          angle: 45,
          castDelay: 0.5,
          outcome: "pull",
          effect: "Конус с задержкой притягивает цели на краю.",
        },
        {
          key: "w",
          name: "Кровожадность",
          icon: talentIcon("storm_ui_icon_garrosh_bloodthirst.png"),
          shape: "target",
          range: 2.5,
          castDelay: 0,
          outcome: "selfHeal",
          effect: "Ближняя цель: точно выбери врага в радиусе.",
        },
        {
          key: "e",
          name: "Живой снаряд",
          icon: talentIcon("storm_ui_icon_garrosh_wrecking_ball.png"),
          shape: "target",
          range: 6,
          castDelay: 0,
          displacement: true,
          outcome: "throw",
          effect: "Выбери врага, а не союзника: цель будет брошена в команду.",
        },
        {
          key: "r",
          name: "Вызов вождя",
          icon: talentIcon("storm_ui_icon_garrosh_warlords_challenge.png"),
          shape: "self",
          range: 3.5,
          castDelay: 0.125,
          outcome: "taunt",
          effect: "Область вокруг Гарроша накладывает провокацию.",
        },
      ],
    },
  };

  Object.assign(TANK_ROSTER, {
    arthas: {
      id: "arthas",
      name: "Артас",
      speed: 4.8398,
      radius: 0.8125,
      abilities: [
        { key: "q", name: "Лик смерти", icon: talentIcon("storm_ui_icon_arthas_deathcoil.png"), shape: "target", range: 8, castDelay: 0.15, outcome: "selfHeal", effect: "Выбери врага для урона или используй на себя для лечения." },
        { key: "w", name: "Воющий ветер", icon: talentIcon("storm_ui_icon_arthas_howlingblast.png"), shape: "area", range: 10, radius: 2, castDelay: 0.15, outcome: "stun", effect: "Поставь корень с учётом задержки и движения цели." },
        { key: "e", name: "Ледяная буря", icon: talentIcon("storm_ui_icon_arthas_frosentempest.png"), shape: "self", range: 3.5, castDelay: 0, outcome: "slow", effect: "Держи мобильных мили-героев внутри ауры замедления." },
        { key: "r", name: "Призыв Синдрагосы", icon: talentIcon("storm_ui_icon_arthas_summonsindragosa.png"), shape: "line", range: 38, width: 8, castDelay: 0.6, outcome: "slow", effect: "Проведи широкую линию через приоритет и путь отступления." },
      ],
    },
    blaze: {
      id: "blaze",
      name: "Блэйз",
      speed: 4.8398,
      radius: 0.9375,
      abilities: [
        { key: "q", name: "Струя пламени", icon: talentIcon("storm_ui_icon_blaze_flame.png"), shape: "line", range: 11.3, width: 0.86, castDelay: 0.125, outcome: "burn", effect: "Узкая линия: проведи обе струи через приоритетную цель." },
        { key: "w", name: "Лужа мазута", icon: talentIcon("storm_ui_icon_blaze_oil.png"), shape: "area", range: 10, radius: 1.5, castDelay: 0.125, outcome: "slow", effect: "Поставь зону на путь движения, а не в текущую позицию." },
        { key: "e", name: "Реактивная тяга", icon: talentIcon("storm_ui_icon_blaze_jet.png"), shape: "line", range: 9.8, width: 2.25, castDelay: 0.375, outcome: "charge", effect: "Рассчитай длинный разгон и зацепи нужного героя." },
        { key: "r", name: "Возгорание", icon: talentIcon("storm_ui_icon_blaze_combustion.png"), shape: "self", range: 6.5, castDelay: 0.125, outcome: "slow", effect: "Войди в центр группы и накрой область вокруг Блэйза." },
      ],
    },
    etc: {
      id: "etc",
      name: "E.T.C.",
      speed: 4.8398,
      radius: 0.9375,
      abilities: [
        { key: "q", name: "Выкат", icon: talentIcon("storm_ui_icon_etc_powerslide.png"), shape: "line", range: 8, width: 2, castDelay: 0, outcome: "charge", effect: "Пройди сквозь фронт так, чтобы линия задела приоритет." },
        { key: "w", name: "Вынос мозга", icon: talentIcon("storm_ui_icon_etc_facemelt.png"), shape: "self", range: 4.4, castDelay: 0, outcome: "knockback", effect: "Оттолкни дайвера от союзника, не спасая основную цель врага." },
        { key: "e", name: "Соло на гитаре", icon: talentIcon("storm_ui_icon_etc_guitarsolo.png"), shape: "self", range: 4.4, castDelay: 0, outcome: "selfHeal", effect: "Сохрани восстановление на момент ответного урона." },
        { key: "r", name: "Мош-пит", icon: talentIcon("storm_ui_icon_etc_moshpit.png"), shape: "self", range: 4, castDelay: 0.75, outcome: "taunt", effect: "Накрой группу, но не начинай канал в готовый interrupt." },
      ],
    },
    johanna: {
      id: "johanna",
      name: "Джоанна",
      speed: 4.8398,
      radius: 0.75,
      abilities: [
        { key: "q", name: "Наказание", icon: talentIcon("storm_ui_icon_johanna_punish.png"), shape: "cone", range: 3.5, angle: 160, castDelay: 0, outcome: "slow", effect: "Широкий ближний конус замедляет фронт и закрывает отход." },
        { key: "w", name: "Порицание", icon: talentIcon("storm_ui_icon_johanna_condemn.png"), shape: "self", range: 5, castDelay: 0.75, outcome: "pull", effect: "Заранее займи центр группы до срабатывания стяжки." },
        { key: "e", name: "Сияющий щит", icon: talentIcon("storm_ui_icon_johanna_shield_glare.png"), shape: "cone", range: 12, angle: 35, castDelay: 0.125, outcome: "stun", effect: "Узкий дальний конус: ослепи основной источник автоатак." },
        { key: "r", name: "Освящённый щит", icon: talentIcon("storm_ui_icon_johanna_blessed_shield.png"), shape: "line", range: 11.3, width: 2, castDelay: 0.1, outcome: "stun", effect: "Попади первым отскоком в приоритетную цель." },
      ],
    },
    malganis: {
      id: "malganis",
      name: "Мал'Ганис",
      speed: 4.8398,
      radius: 0.875,
      abilities: [
        { key: "q", name: "Когти Скверны", icon: talentIcon("storm_ui_icon_malganis_fel_1.png"), shape: "cone", range: 2.125, angle: 180, castDelay: 0, outcome: "stun", effect: "Три коротких рывка; третий удар должен подбросить приоритет." },
        { key: "w", name: "Объятия смерти", icon: talentIcon("storm_ui_icon_malganis_necrotic.png"), shape: "self", range: 3.5, castDelay: 0, outcome: "selfHeal", effect: "Накрой ближайших врагов и получи броню перед ответом." },
        { key: "e", name: "Крылья ночи", icon: talentIcon("storm_ui_icon_malganis_nightrush.png"), shape: "cone", range: 5.5, angle: 105, castDelay: 0.75, outcome: "stun", effect: "Проведи сон через группу после подготовки, не касаясь цели слишком рано." },
        { key: "r", name: "Тёмный обмен", icon: talentIcon("storm_ui_icon_malganis_ult_conversion.png"), shape: "target", range: 3.75, castDelay: 0.75, outcome: "selfHeal", effect: "Выбери героя с высоким здоровьем только из безопасной позиции." },
      ],
    },
    mei: {
      id: "mei",
      name: "Мэй",
      speed: 4.8398,
      radius: 0.875,
      abilities: [
        { key: "q", name: "Снежная слепота", icon: talentIcon("storm_ui_icon_mei_q_snowblind.png"), shape: "area", range: 9.75, radius: 2.25, castDelay: 0.125, outcome: "slow", effect: "Поставь область на автоатакера и зацепи центр хитбокса." },
        { key: "w", name: "Вьюга", icon: talentIcon("storm_ui_icon_mei_w_blizzard.png"), shape: "area", range: 9, radius: 4, castDelay: 0.125, outcome: "stun", effect: "Предскажи позицию к финальному оглушению большой зоны." },
        { key: "e", name: "Гололёд", icon: talentIcon("storm_ui_icon_mei_e1_slide.png"), shape: "line", range: 11, width: 2, castDelay: 0.125, outcome: "charge", effect: "Выбери линию рывка и остановись рядом с приоритетом." },
        { key: "r", name: "Лавина", icon: talentIcon("storm_ui_icon_mei_r1_avalanche.png"), shape: "line", range: 23.5, width: 2.5, castDelay: 0.4375, outcome: "knockback", effect: "Поймай узкой волной важную цель, не забирая союзника из фокуса." },
      ],
    },
    stitches: {
      id: "stitches",
      name: "Стежок",
      speed: 4.8398,
      radius: 1.0625,
      abilities: [
        { key: "q", name: "Крюк", icon: talentIcon("storm_ui_icon_stitches_hook.png"), shape: "line", range: 13.5, width: 1.25, castDelay: 0.2, projectileSpeed: 25, outcome: "pull", effect: "Первая цель блокирует крюк: найди чистую линию до приоритета." },
        { key: "w", name: "Сильный удар", icon: talentIcon("storm_ui_icon_stitches_slam.png"), shape: "cone", range: 9.5, angle: 70, castDelay: 0.2, outcome: "slow", effect: "Попади внутренней частью конуса для усиленного эффекта." },
        { key: "e", name: "Пожирание", icon: talentIcon("storm_ui_icon_stitches_devour.png"), shape: "target", range: 1.5, castDelay: 0, outcome: "selfHeal", effect: "Выбери героя в ближнем радиусе и восстанови здоровье." },
        { key: "r", name: "Заглатывание", icon: talentIcon("storm_ui_icon_stitches_cannibalize.png"), shape: "target", range: 1.5, castDelay: 0, outcome: "cocoon", effect: "Изолируй приоритет только после сближения на реальный радиус." },
      ],
    },
    tyrael: {
      id: "tyrael",
      name: "Тираэль",
      speed: 4.8398,
      radius: 0.75,
      abilities: [
        { key: "q", name: "Мощь Эл'друина", icon: talentIcon("storm_ui_icon_tyrael_eldruinsmight_a.png"), shape: "area", range: 9, radius: 3, castDelay: 0.15, outcome: "leap", effect: "Поставь меч в безопасную точку для замедления и телепорта." },
        { key: "w", name: "Праведность", icon: talentIcon("storm_ui_icon_tyrael_righteousness.png"), shape: "self", range: 5, castDelay: 0, supportive: true, outcome: "shield", effect: "Накрой щитом союзников вокруг Тираэля, а не только себя." },
        { key: "e", name: "Кара", icon: talentIcon("storm_ui_icon_tyrael_smite.png"), shape: "cone", range: 5.5, angle: 75, castDelay: 0, outcome: "slow", effect: "Проведи союзников через область ускорения к следующей позиции." },
        { key: "r", name: "Осуждение", icon: talentIcon("storm_ui_icon_tyrael_judgement.png"), shape: "target", range: 12.5, castDelay: 0.75, outcome: "charge", effect: "Выбери изолированную цель и учти время подготовки рывка." },
      ],
    },
    varian: {
      id: "varian",
      name: "Вариан",
      speed: 4.8398,
      radius: 0.75,
      abilities: [
        { key: "q", name: "Львиный клык", icon: talentIcon("storm_ui_icon_varian_lionsfang.png"), shape: "line", range: 10.65, width: 0.875, castDelay: 0.125, outcome: "slow", effect: "Узкая волна лечит за попадание: проведи её через героя." },
        { key: "w", name: "Парирование", icon: talentIcon("storm_ui_icon_varian_parry.png"), shape: "self", range: 0, castDelay: 0, defensive: true, timingWindow: 0.4, outcome: "shield", effect: "Нажми W в окно входящей автоатаки, а не заранее." },
        { key: "e", name: "Рывок", icon: talentIcon("storm_ui_icon_varian_charge.png"), shape: "target", range: 5, castDelay: 0, outcome: "charge", effect: "Сблизься с приоритетом только после входа в реальный range." },
        { key: "r", name: "Провокация", icon: talentIcon("storm_ui_icon_varian_taunt.png"), shape: "target", range: 2, castDelay: 0, outcome: "taunt", effect: "Зафиксируй мобильную цель в ближнем радиусе для follow-up." },
      ],
    },
  });

  var TANK_IDS = Object.keys(TANK_ROSTER);
  var HERO_RADII = {
    anduin: 0.625,
    anubarak: 1.0625,
    arthas: 0.875,
    diablo: 1.1875,
    garrosh: 0.875,
    genji: 0.625,
    johanna: 0.75,
    l90etc: 0.9375,
    muradin: 0.8125,
    valla: 0.625,
  };

  var DRILLS = {
    ability: {
      id: "ability",
      index: "01",
      kicker: "Точность",
      title: "Ability Placement",
      duration: 60,
      icon: ABILITIES.muradin,
      description:
        "Разыгрывай Q / W / E / R выбранного танка: геометрия, задержка и результат каждой способности различаются.",
      controls:
        "ПКМ двигает выбранного танка с поиском пути. После отдельной фазы чтения направь способность ЛКМ или клавишей; self-cast активируется Q / W / E / R.",
      steps: [
        "Сначала прочитай карточку способности: ситуация появится только после отсчёта.",
        "Синяя рамка и подпись СОЮЗНИК — ваша команда; красная и ВРАГ — противник.",
        "ПКМ займи позицию, с которой реальная дальность позволяет выполнить задачу.",
        "Учти форму, задержку, дальность и радиус модели.",
        "Проверь результат каста: стан, slow, shield, рывок, притяжение или бросок отображаются на арене.",
      ],
      scoring: [
        ["+100", "попадание"],
        ["+0…50", "центр хитбокса"],
        ["+75", "приоритетная цель"],
        ["−40", "промах или выход за дальность"],
        ["−100", "неверная цель"],
      ],
    },
    switch: {
      id: "switch",
      index: "02",
      kicker: "Скорость",
      title: "Target Switch",
      duration: 60,
      icon: ABILITIES.swiftStrike,
      description:
        "Сохраняй давление на фронте, замечай дайвера и выбирай STUN, PEEL или IGNORE.",
      controls:
        "До сигнала держи курсор на основной цели. Затем кликни нужную цель и выбери 1 / 2 / 3.",
      steps: [
        "Первый раунд — обучающий: пять секунд на чтение ролей и действий.",
        "STUN — кликни дайвера и потрать hard CC, если его нельзя спасти Cleanse.",
        "PEEL — кликни дайвера и защити синего союзника позицией, не отдавая контроль.",
        "IGNORE — кликни основную цель и продолжи engage, если союзник в безопасности.",
      ],
      scoring: [
        ["+160", "верные цель и решение"],
        ["+0…100", "скорость решения"],
        ["+0…40", "точность клика"],
        ["−0…80", "лишняя траектория"],
        ["−120", "неверное решение"],
        ["+0…20", "сохранённое давление"],
      ],
    },
    interrupt: {
      id: "interrupt",
      index: "03",
      kicker: "Реакция",
      title: "Interrupt Window",
      duration: 30,
      icon: ABILITIES.mosh,
      description:
        "Отличай опасный каст от feint, отмены и Unstoppable. Нажимай контроль только в окно.",
      controls:
        "Q, пробел, ЛКМ или кнопка Q в HUD — interrupt. На ложное окно ничего не нажимай.",
      steps: [
        "Красный опасный каст нужно прервать до завершения.",
        "Unstoppable означает, что контроль не сработает.",
        "FEINT, CANCEL и безопасная способность требуют сохранить кнопку.",
      ],
      scoring: [
        ["+200", "успешный interrupt"],
        ["+0…100", "скорость реакции"],
        ["+60", "контроль сохранён"],
        ["−75", "реакция на feint / safe cast"],
        ["−100", "контроль в Unstoppable"],
        ["−150", "пропущенный каст"],
      ],
    },
    bodyblock: {
      id: "bodyblock",
      index: "04",
      kicker: "Контроль позиции",
      title: "Bodyblock",
      duration: 60,
      icon: avatar("muradin"),
      description:
        "Закрой путь к выходу, сохрани дистанцию до команды и не заходи в зону башен.",
      controls:
        "ПКМ по земле — приказ движения. S — остановка. На сенсорном экране команду заменяет касание.",
      steps: [
        "Клик создаёт маршрут; герой сам обходит непроходимые блоки.",
        "Физический хитбокс и скорость соответствуют выбранному танку в сборке 97.0.39.",
        "Противник видит блок, выбирает свободную сторону и может сделать ложный финт.",
        "Перестраивай путь ПКМ, держись между врагом и выходом, но не отрывайся от команды.",
      ],
      scoring: [
        ["+75/с", "качественный bodyblock"],
        ["+350", "удержание выхода"],
        ["−180", "прорыв противника"],
        ["−55/с", "хитбокс под башней"],
        ["−35/с", "отрыв от команды"],
      ],
    },
  };

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function lerp(from, to, amount) {
    return from + (to - from) * amount;
  }

  function distance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function normalizeVector(x, y) {
    var length = Math.max(0.001, Math.sqrt(x * x + y * y));
    return { x: x / length, y: y / length };
  }

  function randomBetween(minimum, maximum) {
    return minimum + Math.random() * (maximum - minimum);
  }

  function choose(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function formatNumber(value) {
    return Math.round(Number(value) || 0).toLocaleString("ru-RU");
  }

  function formatTime(milliseconds) {
    var totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = String(totalSeconds % 60).padStart(2, "0");
    return minutes + ":" + seconds;
  }

  function loadProgress() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (!parsed.best) parsed.best = {};
      if (!parsed.difficulty) parsed.difficulty = {};
      return parsed;
    } catch (_error) {
      return { best: {}, difficulty: {} };
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (_error) {
      return;
    }
  }

  function makeElement(tagName, className, html) {
    var element = document.createElement(tagName);
    if (className) element.className = className;
    if (html !== undefined) element.innerHTML = html;
    return element;
  }

  function scheduleBoot() {
    if (bootQueued) return;
    bootQueued = true;
    window.setTimeout(function () {
      bootQueued = false;
      boot();
    }, 40);
  }

  function destroyReaderSession() {
    if (!readerSession) return;
    readerSession.cleanup();
    readerSession = null;
  }

  function initReader() {
    var nav = document.querySelector(".reader-nav");
    if (!nav) {
      destroyReaderSession();
      return;
    }
    if (readerSession && readerSession.nav === nav) return;
    destroyReaderSession();

    var toc = nav.querySelector(".reader-toc");
    var links = toc ? Array.prototype.slice.call(toc.querySelectorAll("a[href^='#']")) : [];
    var headings = links
      .map(function (link) {
        try {
          return document.getElementById(decodeURIComponent(link.hash.slice(1)));
        } catch (_error) {
          return document.getElementById(link.hash.slice(1));
        }
      })
      .filter(Boolean);

    if (!toc || !links.length || headings.length !== links.length) return;

    var title = toc.querySelector(":scope > span");
    var lastIndex = -1;
    var frame = 0;

    function keepActiveVisible(activeLink) {
      if (!activeLink) return;
      var containerRect = toc.getBoundingClientRect();
      var linkRect = activeLink.getBoundingClientRect();
      var horizontal = window.innerWidth <= 820;
      var behavior = "auto";

      if (horizontal) {
        if (
          linkRect.left < containerRect.left + 16 ||
          linkRect.right > containerRect.right - 16
        ) {
          toc.scrollTo({
            left:
              toc.scrollLeft +
              linkRect.left -
              containerRect.left -
              (containerRect.width - linkRect.width) / 2,
            behavior: behavior,
          });
        }
      } else if (
        linkRect.top < containerRect.top + 38 ||
        linkRect.bottom > containerRect.bottom - 16
      ) {
        toc.scrollTo({
          top:
            toc.scrollTop +
            linkRect.top -
            containerRect.top -
            (containerRect.height - linkRect.height) / 2,
          behavior: behavior,
        });
      }
    }

    function updateReader() {
      frame = 0;
      if (!document.documentElement.contains(nav)) {
        scheduleBoot();
        return;
      }

      var threshold = Math.min(210, Math.max(112, window.innerHeight * 0.24));
      var nextIndex = 0;
      headings.forEach(function (heading, index) {
        if (heading.getBoundingClientRect().top <= threshold) nextIndex = index;
      });
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 8
      ) {
        nextIndex = headings.length - 1;
      }

      links.forEach(function (link, index) {
        var active = index === nextIndex;
        if (active) link.setAttribute("data-scroll-current", "");
        else link.removeAttribute("data-scroll-current");
        if (active && link.getAttribute("aria-current") !== "location") {
          link.setAttribute("aria-current", "location");
        } else if (!active && link.hasAttribute("aria-current")) {
          link.removeAttribute("aria-current");
        }
      });

      if (title) {
        title.setAttribute("data-reader-current", "");
        title.setAttribute(
          "data-current-section",
          String(nextIndex + 1).padStart(2, "0") +
            " / " +
            headings.length +
            " · " +
            links[nextIndex].textContent.replace(/^\d+/, "").trim(),
        );
      }
      if (nextIndex !== lastIndex) {
        lastIndex = nextIndex;
        keepActiveVisible(links[nextIndex]);
      }
    }

    function queueReaderUpdate() {
      if (frame) return;
      frame = requestAnimationFrame(function () {
        requestAnimationFrame(updateReader);
      });
    }

    window.addEventListener("scroll", queueReaderUpdate, { passive: true });
    window.addEventListener("resize", queueReaderUpdate);
    window.addEventListener("hashchange", queueReaderUpdate);
    toc.addEventListener("click", queueReaderUpdate);
    queueReaderUpdate();

    readerSession = {
      nav: nav,
      cleanup: function () {
        if (frame) cancelAnimationFrame(frame);
        window.removeEventListener("scroll", queueReaderUpdate);
        window.removeEventListener("resize", queueReaderUpdate);
        window.removeEventListener("hashchange", queueReaderUpdate);
        toc.removeEventListener("click", queueReaderUpdate);
      },
    };
  }

  function drillCardsMarkup() {
    return Object.keys(DRILLS)
      .map(function (key) {
        var drill = DRILLS[key];
        return [
          '<article class="mechanic-card" data-drill-card="',
          drill.id,
          '">',
          '<div class="mechanic-card__head">',
          '<span class="mechanic-card__index">',
          drill.index,
          " / ",
          drill.kicker,
          "</span>",
          '<span class="mechanic-card__time">',
          drill.duration,
          " СЕК",
          "</span>",
          "</div>",
          '<div class="mechanic-card__visual" aria-hidden="true">',
          '<img src="',
          drill.icon,
          '" alt=""/>',
          "<i></i><b></b>",
          "</div>",
          "<h3><small>",
          drill.kicker,
          "</small>",
          drill.title,
          "</h3>",
          "<p>",
          drill.description,
          "</p>",
          '<div class="mechanic-card__foot">',
          '<div class="mechanic-card__best">',
          "<span>Лучший результат</span>",
          '<strong data-best-score="',
          drill.id,
          '">—</strong>',
          '<small data-best-detail="',
          drill.id,
          '">Сессий ещё не было</small>',
          "</div>",
          '<button class="mechanics-button" type="button" data-start-drill="',
          drill.id,
          '">Тренировать</button>',
          "</div>",
          "</article>",
        ].join("");
      })
      .join("");
  }

  function mechanicsMarkup() {
    return [
      '<header class="mechanics-header">',
      "<div>",
      '<span class="mechanics-kicker">MECHANICS LAB / NATIVE CANVAS</span>',
      "<h2>Рука следует<br/><span>за решением.</span></h2>",
      "</div>",
      "<div>",
      "<p>Короткие сессии тренируют точность кнопки, смену фокуса, окно контроля и геометрию bodyblock. Каждый сценарий остаётся привязан к роли танка.</p>",
      "<dl>",
      "<div><dt>4</dt><dd>механических drill</dd></div>",
      "<div><dt>30–60</dt><dd>секунд на сессию</dd></div>",
      "</dl>",
      "</div>",
      "</header>",
      '<section class="tank-warmup" aria-labelledby="tank-warmup-title">',
      "<div>",
      '<span class="warmup-label">ГОТОВЫЙ МАРШРУТ</span>',
      '<h3 id="tank-warmup-title">Танковая разминка — 6 минут</h3>',
      "<p>Четыре механики, затем применение в Decision Lab.</p>",
      "</div>",
      '<div class="warmup-track" aria-label="Этапы разминки">',
      "<span><b>1:00</b>Точность</span>",
      "<span><b>1:00</b>Switch</span>",
      "<span><b>1:00</b>Interrupt</span>",
      "<span><b>1:00</b>Bodyblock</span>",
      "<span><b>2:00</b>Decision Scenario</span>",
      "</div>",
      '<button class="mechanics-button" type="button" data-start-warmup>Начать разминку</button>',
      "</section>",
      '<section class="mechanics-drills" aria-label="Механические тренажёры">',
      drillCardsMarkup(),
      "</section>",
    ].join("");
  }

  function modeMarkup() {
    return [
      '<section class="lab-mode-control" aria-labelledby="lab-mode-title">',
      '<div class="lab-mode-control__intro">',
      "<span>ПОЛИГОН / ДВА КОНТУРА</span>",
      '<strong id="lab-mode-title">Сначала исполни. Затем реши, стоило ли входить.</strong>',
      "<p>Механика разогревает руку и внимание. Тактика превращает их в правильный engage, peel и короткий колл.</p>",
      "</div>",
      '<div class="lab-mode-tabs" role="tablist" aria-label="Режим полигона">',
      '<button class="lab-mode-tab" type="button" role="tab" id="lab-tab-tactics" aria-controls="tactics-lab-panel" aria-selected="true" data-lab-mode="tactics">',
      "<span>01</span><div><strong>Тактика</strong><small>Fight Check · Draft · Comms · Geometry</small></div><i></i>",
      "</button>",
      '<button class="lab-mode-tab" type="button" role="tab" id="lab-tab-mechanics" aria-controls="mechanics-lab-panel" aria-selected="false" data-lab-mode="mechanics">',
      "<span>02</span><div><strong>Механика</strong><small>Точность · Switch · Реакция · Bodyblock</small></div><i></i>",
      "</button>",
      "</div>",
      "</section>",
    ].join("");
  }

  function overlayMarkup() {
    var friendlies = ["muradin", "valla", "anduin", "johanna", "anubarak"];
    var enemies = ["genji", "diablo", "garrosh", "l90etc", "arthas"];

    function teamMarkup(team, enemy) {
      return [
        '<div class="team-strip ',
        enemy ? "team-strip--enemy" : "",
        '" aria-label="',
        enemy ? "Команда противника" : "Команда игрока",
        '">',
        team
          .map(function (hero, index) {
            return [
              '<span class="team-strip__hero ',
              index === 0 ? "is-active" : "",
              '"><img src="',
              avatar(hero),
              '" alt="',
              HERO_NAMES[hero] || hero,
              '"/></span>',
            ].join("");
          })
          .join(""),
        "</div>",
      ].join("");
    }

    return [
      '<div class="mechanics-overlay" hidden>',
      '<div class="mechanics-dialog" role="dialog" aria-modal="true" aria-labelledby="arena-title">',
      '<header class="mechanics-topbar">',
      teamMarkup(friendlies, false),
      '<div class="match-core">',
      '<span data-arena-label>MECHANICS LAB</span>',
      "<div><strong data-arena-score>0</strong><i></i><time data-arena-time>0:35</time></div>",
      "</div>",
      teamMarkup(enemies, true),
      '<button class="mechanics-close" type="button" aria-label="Закрыть тренажёр" data-close-arena>',
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M4.15 4.15a.5.5 0 0 1 .7 0L10 9.3l5.15-5.15a.5.5 0 1 1 .7.7L10.7 10l5.15 5.15a.5.5 0 0 1-.7.7L10 10.7l-5.15 5.15a.5.5 0 0 1-.7-.7L9.3 10 4.15 4.85a.5.5 0 0 1 0-.7Z"/></svg>',
      "</button>",
      "</header>",
      '<div class="mechanics-stage">',
      '<canvas aria-label="Интерактивная арена тренажёра" tabindex="0"></canvas>',
      '<div class="arena-callout" aria-live="polite"></div>',
      '<div class="arena-context"></div>',
      '<div class="arena-telemetry" aria-live="polite">',
      '<span><small>ПОСЛЕДНЯЯ РЕАКЦИЯ</small><strong data-arena-reaction>—</strong></span>',
      '<span><small>ЛУЧШЕЕ ВРЕМЯ</small><strong data-arena-best-reaction>—</strong></span>',
      '<span><small>ТЕКУЩИЙ ПАРАМЕТР</small><strong data-arena-parameter>97.0.39</strong></span>',
      "</div>",
      '<div class="arena-feedback" aria-live="assertive"></div>',
      '<div class="arena-cast" aria-hidden="true"><div class="arena-cast__track"><i></i></div><strong></strong></div>',
      '<div class="arena-actions" aria-label="Действие после переключения">',
      '<span class="arena-actions__step" data-switch-step>ШАГ 1 · ВЫБЕРИ ЦЕЛЬ</span>',
      '<button class="arena-action" type="button" data-switch-action="stun" disabled><kbd>1</kbd><span><strong>STUN</strong><small>hard CC по дайверу</small></span></button>',
      '<button class="arena-action" type="button" data-switch-action="peel" disabled><kbd>2</kbd><span><strong>PEEL</strong><small>защита backline</small></span></button>',
      '<button class="arena-action" type="button" data-switch-action="ignore" disabled><kbd>3</kbd><span><strong>IGNORE</strong><small>сохранить engage</small></span></button>',
      "</div>",
      '<section class="arena-brief"></section>',
      '<section class="arena-report" hidden></section>',
      "</div>",
      '<footer class="mechanics-hud">',
      '<div class="player-frame">',
      '<div class="player-frame__portrait"><img data-hud-portrait src="',
      avatar("muradin"),
      '" alt="Мурадин"/></div>',
      '<div class="player-frame__stats"><strong data-hud-hero>МУРАДИН · УРОВЕНЬ 20</strong><span class="hud-resource"><i style="--value:100%"></i></span><span class="hud-resource hud-resource--mana"><i style="--value:100%"></i></span></div>',
      "</div>",
      '<div class="ability-bar" aria-label="Способности">',
      '<button class="hud-ability" type="button" data-hud-key="q"><img src="',
      ABILITIES.muradin,
      '" alt="Грозовой молот"/><kbd>Q</kbd></button>',
      '<button class="hud-ability" type="button" data-hud-key="w"><img src="',
      ABILITIES.anubarak,
      '" alt="Пронзание"/><kbd>W</kbd></button>',
      '<button class="hud-ability" type="button" data-hud-key="e"><img src="',
      ABILITIES.diablo,
      '" alt="Натиск тени"/><kbd>E</kbd></button>',
      '<button class="hud-ability" type="button" data-hud-key="r"><img src="',
      ABILITIES.garrosh,
      '" alt="Живой снаряд"/><kbd>R</kbd></button>',
      "</div>",
      '<div class="hud-session"><span class="mechanics-session__label">ТЕКУЩАЯ СЕССИЯ</span><strong data-hud-title>ABILITY PLACEMENT</strong><small data-hud-hint>Выбери приоритетную цель</small></div>',
      "</footer>",
      "</div>",
      "</div>",
    ].join("");
  }

  function updateHeroCopy() {
    var hero = document.querySelector(".lab-page .page-hero");
    if (!hero) return;
    var eyebrow = hero.querySelector(".eyebrow");
    if (eyebrow) {
      var first = eyebrow.querySelector("span");
      var last = eyebrow.querySelector("em");
      if (first) first.textContent = "TRAINING LAB";
      if (last) last.textContent = "2 LABS · 8 SYSTEMS";
    }
    var metric = hero.querySelector("dl > div:first-child");
    if (metric) {
      var number = metric.querySelector("dt");
      if (number) number.textContent = "8";
    }
  }

  function updateBestCards(root, progress) {
    Object.keys(DRILLS).forEach(function (id) {
      var score = root.querySelector('[data-best-score="' + id + '"]');
      var detail = root.querySelector('[data-best-detail="' + id + '"]');
      var best = progress.best[id];
      if (!score || !detail) return;
      if (!best) {
        score.textContent = "—";
        detail.textContent = "Сессий ещё не было";
        return;
      }
      score.textContent = formatNumber(best.score);
      detail.textContent = best.detail || "Личный рекорд";
    });
  }

  function initLab() {
    var labPage = document.querySelector(".lab-page");
    var tactics = labPage ? labPage.querySelector(".lab-stack") : null;
    if (!labPage || !tactics) {
      if (labSession && !document.documentElement.contains(labSession.root)) {
        labSession.destroy();
        labSession = null;
      }
      return;
    }
    if (labSession && labSession.root === labPage) return;
    if (labSession) labSession.destroy();

    updateHeroCopy();
    var shell = tactics.parentElement;
    var modeControl = makeElement("div", "", modeMarkup()).firstElementChild;
    var mechanics = makeElement(
      "section",
      "mechanics-lab lab-mode-panel",
      mechanicsMarkup(),
    );
    var progress = loadProgress();

    tactics.id = "tactics-lab-panel";
    tactics.classList.add("lab-mode-panel");
    tactics.setAttribute("role", "tabpanel");
    tactics.setAttribute("aria-labelledby", "lab-tab-tactics");
    mechanics.id = "mechanics-lab-panel";
    mechanics.setAttribute("role", "tabpanel");
    mechanics.setAttribute("aria-labelledby", "lab-tab-mechanics");
    mechanics.hidden = true;

    shell.insertBefore(modeControl, tactics);
    tactics.insertAdjacentElement("afterend", mechanics);
    updateBestCards(mechanics, progress);

    var overlay = makeElement("div", "", overlayMarkup()).firstElementChild;
    document.body.appendChild(overlay);

    function selectMode(mode, shouldScroll) {
      var mechanicsActive = mode === "mechanics";
      modeControl.querySelectorAll("[data-lab-mode]").forEach(function (tab) {
        tab.setAttribute(
          "aria-selected",
          String(tab.getAttribute("data-lab-mode") === mode),
        );
      });
      tactics.hidden = mechanicsActive;
      mechanics.hidden = !mechanicsActive;
      var panel = mechanicsActive ? mechanics : tactics;
      panel.classList.remove("is-entering");
      void panel.offsetWidth;
      panel.classList.add("is-entering");
      if (shouldScroll) {
        modeControl.scrollIntoView({
          behavior: reducedMotion.matches ? "auto" : "smooth",
          block: "start",
        });
      }
    }

    var controller = new ArenaController({
      root: mechanics,
      overlay: overlay,
      progress: progress,
      selectMode: selectMode,
      tactics: tactics,
    });

    modeControl.addEventListener("click", function (event) {
      var tab = event.target.closest("[data-lab-mode]");
      if (!tab) return;
      selectMode(tab.getAttribute("data-lab-mode"), false);
    });
    mechanics.addEventListener("click", function (event) {
      var start = event.target.closest("[data-start-drill]");
      var warmup = event.target.closest("[data-start-warmup]");
      if (start) controller.open(start.getAttribute("data-start-drill"));
      if (warmup) controller.startWarmup();
    });

    var initialMode =
      location.hash === "#mechanics" || location.hash === "#mechanics-lab-panel"
        ? "mechanics"
        : "tactics";
    selectMode(initialMode, false);

    labSession = {
      root: labPage,
      controller: controller,
      destroy: function () {
        controller.destroy();
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      },
    };
    window.__tankMechanicsLab = controller;
  }

  function ArenaController(options) {
    this.root = options.root;
    this.overlay = options.overlay;
    this.progress = options.progress;
    this.selectMode = options.selectMode;
    this.tactics = options.tactics;
    this.dialog = this.overlay.querySelector(".mechanics-dialog");
    this.stage = this.overlay.querySelector(".mechanics-stage");
    this.canvas = this.overlay.querySelector("canvas");
    this.context = this.canvas.getContext("2d", { alpha: true });
    this.callout = this.overlay.querySelector(".arena-callout");
    this.contextText = this.overlay.querySelector(".arena-context");
    this.reactionElement = this.overlay.querySelector("[data-arena-reaction]");
    this.bestReactionElement = this.overlay.querySelector(
      "[data-arena-best-reaction]",
    );
    this.parameterElement = this.overlay.querySelector("[data-arena-parameter]");
    this.feedback = this.overlay.querySelector(".arena-feedback");
    this.cast = this.overlay.querySelector(".arena-cast");
    this.castTrack = this.cast.querySelector("i");
    this.castLabel = this.cast.querySelector("strong");
    this.actions = this.overlay.querySelector(".arena-actions");
    this.switchStep = this.overlay.querySelector("[data-switch-step]");
    this.brief = this.overlay.querySelector(".arena-brief");
    this.report = this.overlay.querySelector(".arena-report");
    this.scoreElement = this.overlay.querySelector("[data-arena-score]");
    this.timeElement = this.overlay.querySelector("[data-arena-time]");
    this.arenaLabel = this.overlay.querySelector("[data-arena-label]");
    this.hudTitle = this.overlay.querySelector("[data-hud-title]");
    this.hudHint = this.overlay.querySelector("[data-hud-hint]");
    this.hudPortrait = this.overlay.querySelector("[data-hud-portrait]");
    this.hudHero = this.overlay.querySelector("[data-hud-hero]");
    this.hudButtons = Array.prototype.slice.call(
      this.overlay.querySelectorAll("[data-hud-key]"),
    );
    this.images = new Map();
    this.phase = "closed";
    this.drillId = "";
    this.drillState = null;
    this.stats = {};
    this.score = 0;
    this.duration = 0;
    this.difficulty = 1;
    this.selectedHero = TANK_ROSTER[this.progress.selectedHero]
      ? this.progress.selectedHero
      : "muradin";
    this.reactionValues = [];
    this.pointer = { x: 0, y: 0, active: false };
    this.bodyCommandHeld = false;
    this.lastBodyCommandAt = 0;
    this.width = 0;
    this.height = 0;
    this.pixelRatio = 1;
    this.animationFrame = 0;
    this.lastGameNow = 0;
    this.endGameAt = 0;
    this.countdownEnd = 0;
    this.pausedTotal = 0;
    this.pausedAtReal = 0;
    this.lastFocus = null;
    this.warmup = null;
    this.decisionTimer = 0;
    this.decisionEndsAt = 0;
    this.feedbackTimer = 0;
    this.resizeObserver = new ResizeObserver(this.resize.bind(this));
    this.resizeObserver.observe(this.stage);
    this.boundKeydown = this.onKeydown.bind(this);
    this.boundVisibility = this.onVisibilityChange.bind(this);
    this.bindEvents();
    this.preloadAssets();
  }

  ArenaController.prototype.bindEvents = function () {
    var self = this;
    this.overlay
      .querySelector("[data-close-arena]")
      .addEventListener("click", function () {
        self.close();
      });
    this.canvas.addEventListener("pointermove", function (event) {
      self.onPointerMove(event);
    });
    this.canvas.addEventListener("pointerdown", function (event) {
      self.onPointerDown(event);
    });
    this.canvas.addEventListener("pointerup", function (event) {
      if (event.button === 2 || event.pointerType === "touch") {
        self.bodyCommandHeld = false;
      }
    });
    this.canvas.addEventListener("pointercancel", function () {
      self.bodyCommandHeld = false;
    });
    this.canvas.addEventListener("contextmenu", function (event) {
      if (
        self.phase === "running" &&
        (self.drillId === "bodyblock" || self.drillId === "ability")
      ) {
        event.preventDefault();
      }
    });
    this.overlay.querySelectorAll("[data-switch-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        self.chooseSwitchAction(button.getAttribute("data-switch-action"));
      });
    });
    this.hudButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        self.useHudKey(button.getAttribute("data-hud-key"));
      });
    });
    document.addEventListener("keydown", this.boundKeydown);
    document.addEventListener("visibilitychange", this.boundVisibility);
  };

  ArenaController.prototype.destroy = function () {
    this.close();
    this.resizeObserver.disconnect();
    document.removeEventListener("keydown", this.boundKeydown);
    document.removeEventListener("visibilitychange", this.boundVisibility);
    if (this.decisionTimer) window.clearInterval(this.decisionTimer);
    if (this.decisionBanner && this.decisionBanner.parentNode) {
      this.decisionBanner.parentNode.removeChild(this.decisionBanner);
    }
    if (this.toast && this.toast.parentNode) this.toast.parentNode.removeChild(this.toast);
  };

  ArenaController.prototype.preloadAssets = function () {
    var self = this;
    var urls = [
      avatar("muradin"),
      avatar("valla"),
      avatar("anduin"),
      avatar("johanna"),
      avatar("anubarak"),
      avatar("genji"),
      avatar("diablo"),
      avatar("garrosh"),
      avatar("l90etc"),
      avatar("arthas"),
      statusIcon("unstoppable"),
      statusIcon("stun"),
    ]
      .concat(
        Object.keys(ABILITIES).map(function (key) {
          return ABILITIES[key];
        }),
      )
      .concat(
        TANK_IDS.reduce(function (urls, heroId) {
          urls.push(avatar(heroId));
          TANK_ROSTER[heroId].abilities.forEach(function (ability) {
            urls.push(ability.icon);
          });
          return urls;
        }, []),
      );

    urls.forEach(function (url) {
      if (self.images.has(url)) return;
      var image = new Image();
      image.decoding = "async";
      image.src = url;
      self.images.set(url, image);
    });
  };

  ArenaController.prototype.now = function (realNow) {
    return (realNow === undefined ? performance.now() : realNow) - this.pausedTotal;
  };

  ArenaController.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var previousWidth = this.width;
    var previousHeight = this.height;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var width = Math.round(rect.width * ratio);
    var height = Math.round(rect.height * ratio);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.width = rect.width;
    this.height = rect.height;
    this.pixelRatio = ratio;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (
      this.phase === "running" &&
      this.drillState &&
      previousWidth > 0 &&
      previousHeight > 0 &&
      (Math.abs(previousWidth - this.width) > 1 || Math.abs(previousHeight - this.height) > 1)
    ) {
      var scaleX = this.width / previousWidth;
      var scaleY = this.height / previousHeight;
      var scalePoint = function (point) {
        if (!point || typeof point.x !== "number" || typeof point.y !== "number") return;
        point.x *= scaleX;
        point.y *= scaleY;
      };
      scalePoint(this.pointer);
      if (this.drillId === "ability") {
        scalePoint(this.drillState.tank);
        scalePoint(this.drillState.moveTarget);
        (this.drillState.movePath || []).forEach(scalePoint);
        (this.drillState.obstacles || []).forEach(function (obstacle) {
          obstacle.x *= scaleX;
          obstacle.y *= scaleY;
          obstacle.width *= scaleX;
          obstacle.height *= scaleY;
        });
        this.drillState.targets.forEach(scalePoint);
        if (this.drillState.trail) {
          scalePoint(this.drillState.trail.from);
          scalePoint(this.drillState.trail.to);
        }
      } else if (this.drillId === "switch") {
        scalePoint(this.drillState.main);
        scalePoint(this.drillState.healer);
        scalePoint(this.drillState.diver);
      } else if (this.drillId === "bodyblock") {
        scalePoint(this.drillState.tank);
        scalePoint(this.drillState.enemy);
        scalePoint(this.drillState.target);
        (this.drillState.path || []).forEach(scalePoint);
        (this.drillState.enemyPath || []).forEach(scalePoint);
        this.drillState.layout = this.bodyblockLayout();
        var resizedScale = this.arenaUnitScale();
        this.drillState.tank.radius = this.drillState.hero.radius * resizedScale;
        this.drillState.enemy.radius = (HERO_RADII.valla || 0.625) * resizedScale;
        this.issueBodyblockCommand(this.drillState.target, this.now(), true);
        this.drillState.enemyPath = [];
      }
    }
    if (this.phase === "brief" || this.phase === "report") this.renderIdle();
  };

  ArenaController.prototype.pointerFromEvent = function (event) {
    var rect = this.canvas.getBoundingClientRect();
    return {
      x: clamp(event.clientX - rect.left, 0, rect.width),
      y: clamp(event.clientY - rect.top, 0, rect.height),
    };
  };

  ArenaController.prototype.onPointerMove = function (event) {
    var next = this.pointerFromEvent(event);
    if (
      this.phase === "running" &&
      this.drillId === "switch" &&
      this.drillState &&
      this.drillState.mode === "signal" &&
      this.pointer.active
    ) {
      this.drillState.pathLength += distance(this.pointer, next);
    }
    this.pointer.x = next.x;
    this.pointer.y = next.y;
    this.pointer.active = true;
    if (
      this.phase === "running" &&
      this.drillId === "bodyblock" &&
      this.bodyCommandHeld &&
      this.drillState &&
      this.now() - this.lastBodyCommandAt >= 120
    ) {
      this.issueBodyblockCommand(next, this.now(), true);
    }
    if (
      this.phase === "running" &&
      this.drillId === "ability" &&
      this.bodyCommandHeld &&
      this.drillState &&
      this.now() - this.lastBodyCommandAt >= 120
    ) {
      this.issueAbilityMove(next, this.now(), true);
    }
  };

  ArenaController.prototype.onPointerDown = function (event) {
    if (this.phase !== "running") return;
    var point = this.pointerFromEvent(event);
    this.pointer.x = point.x;
    this.pointer.y = point.y;
    this.pointer.active = true;
    if (this.drillId === "ability" && event.button === 0) this.handleAbilityShot(point);
    else if (
      this.drillId === "ability" &&
      this.drillState &&
      event.button === 2
    ) {
      event.preventDefault();
      this.bodyCommandHeld = true;
      this.issueAbilityMove(point, this.now(), false);
    }
    else if (this.drillId === "switch" && event.button === 0) this.handleSwitchTarget(point);
    else if (this.drillId === "interrupt" && event.button === 0) this.handleInterrupt();
    else if (
      this.drillId === "bodyblock" &&
      this.drillState &&
      (event.button === 2 || event.pointerType === "touch")
    ) {
      event.preventDefault();
      this.bodyCommandHeld = true;
      this.issueBodyblockCommand(point, this.now(), false);
      if (this.canvas.setPointerCapture) {
        try {
          this.canvas.setPointerCapture(event.pointerId);
        } catch (_error) {
          return;
        }
      }
    }
  };

  ArenaController.prototype.onKeydown = function (event) {
    if (this.overlay.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }
    if (
      this.phase === "brief" &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      this.start();
      return;
    }
    if (this.phase !== "running") return;
    var key = event.key.toLowerCase();
    if (this.drillId === "ability" && ["q", "w", "e", "r"].indexOf(key) >= 0) {
      event.preventDefault();
      this.useHudKey(key);
    }
    if (this.drillId === "interrupt" && (key === "q" || event.key === " ")) {
      event.preventDefault();
      this.handleInterrupt();
    }
    if (this.drillId === "switch") {
      if (key === "1") this.chooseSwitchAction("stun");
      if (key === "2") this.chooseSwitchAction("peel");
      if (key === "3") this.chooseSwitchAction("ignore");
    }
    if (this.drillId === "bodyblock" && key === "s" && this.drillState) {
      event.preventDefault();
      this.stopBodyblockMovement();
    }
  };

  ArenaController.prototype.onVisibilityChange = function () {
    if (this.overlay.hidden) return;
    if (document.hidden && (this.phase === "running" || this.phase === "countdown")) {
      this.pausedAtReal = performance.now();
      if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    } else if (
      !document.hidden &&
      this.pausedAtReal &&
      (this.phase === "running" || this.phase === "countdown")
    ) {
      this.pausedTotal += performance.now() - this.pausedAtReal;
      this.pausedAtReal = 0;
      this.lastGameNow = this.now();
      this.queueFrame();
    }
  };

  ArenaController.prototype.open = function (drillId, options) {
    options = options || {};
    var drill = DRILLS[drillId];
    if (!drill) return;
    this.cancelFrame();
    this.drillId = drillId;
    this.duration = options.duration || drill.duration;
    this.difficulty =
      options.difficulty ||
      this.progress.difficulty[drillId] ||
      1;
    this.warmup = options.warmup || null;
    this.phase = "brief";
    this.score = 0;
    this.stats = {};
    this.drillState = null;
    this.pausedTotal = 0;
    this.pausedAtReal = 0;
    this.lastFocus = document.activeElement;
    this.overlay.hidden = false;
    this.overlay.setAttribute("data-drill", drillId);
    this.overlay.classList.remove("is-opening");
    void this.overlay.offsetWidth;
    this.overlay.classList.add("is-opening");
    document.body.classList.add("mechanics-is-open");
    this.actions.classList.remove("is-visible");
    this.cast.classList.remove("is-visible");
    this.report.hidden = true;
    this.report.innerHTML = "";
    this.brief.hidden = false;
    this.callout.textContent = "";
    this.contextText.textContent = "";
    this.setScore(0);
    this.resetReactionTelemetry(
      drillId === "bodyblock" ? "СКОРОСТЬ 4,8398" : "СБОРКА 97.0.39",
    );
    this.timeElement.textContent = formatTime(this.duration * 1000);
    this.arenaLabel.textContent =
      this.warmup && this.warmup.active
        ? "РАЗМИНКА · ЭТАП " + (this.warmup.index + 1) + " / 5"
        : drill.kicker.toUpperCase();
    this.hudTitle.textContent = drill.title.toUpperCase();
    this.hudHint.textContent = drill.description;
    this.configureHud();
    this.renderBrief(drill);
    requestAnimationFrame(this.resize.bind(this));
    requestAnimationFrame(this.renderIdle.bind(this));
    var startButton = this.overlay.querySelector("[data-start-session]");
    try {
      startButton.focus({ preventScroll: true });
    } catch (_error) {
      startButton.focus();
    }
    this.brief.scrollTop = 0;
  };

  ArenaController.prototype.close = function () {
    if (this.overlay.hidden) return;
    this.cancelFrame();
    this.phase = "closed";
    this.overlay.hidden = true;
    this.overlay.removeAttribute("data-drill");
    this.overlay.classList.remove("is-opening");
    document.body.classList.remove("mechanics-is-open");
    this.actions.classList.remove("is-visible");
    this.cast.classList.remove("is-visible");
    this.bodyCommandHeld = false;
    this.warmup = null;
    if (this.lastFocus && document.documentElement.contains(this.lastFocus)) {
      this.lastFocus.focus();
    }
  };

  function abilityShapeLabel(ability) {
    if (ability.defensive) return "SELF-CAST";
    if (ability.shape === "line") return "ЛИНИЯ";
    if (ability.shape === "area") return "ОБЛАСТЬ";
    if (ability.shape === "cone") return "КОНУС";
    if (ability.shape === "self") return "ВОКРУГ ГЕРОЯ";
    return "ЦЕЛЬ";
  }

  function abilityGeometryLabel(ability) {
    if (ability.defensive) {
      return (
        "self-cast · окно защиты " +
        Math.round((ability.timingWindow || 0.4) * 1000) +
        " мс"
      );
    }
    var values = ["дальность " + String(ability.range).replace(".", ",")];
    if (ability.width) values.push("ширина " + String(ability.width).replace(".", ","));
    if (ability.radius) values.push("радиус " + String(ability.radius).replace(".", ","));
    if (ability.minimumRange) {
      values.push(
        "рабочая полоса " +
          String(ability.minimumRange).replace(".", ",") +
          "–" +
          String(ability.range).replace(".", ","),
      );
    }
    if (ability.angle) values.push("угол " + ability.angle + "°");
    if (ability.castDelay) values.push("задержка " + String(ability.castDelay).replace(".", ",") + " с");
    return values.join(" · ");
  }

  ArenaController.prototype.heroSelectorMarkup = function () {
    var selectedHero = this.selectedHero;
    var hero = TANK_ROSTER[selectedHero];
    return [
      '<section class="arena-hero-select" aria-labelledby="arena-hero-select-title">',
      '<div class="arena-guide__label" id="arena-hero-select-title">ВЫБОР ТАНКА</div>',
      '<div class="arena-hero-select__list" role="list">',
      TANK_IDS.map(function (heroId) {
        var option = TANK_ROSTER[heroId];
        return [
          '<button type="button" class="arena-hero-option',
          heroId === selectedHero ? " is-selected" : "",
          '" data-select-hero="',
          heroId,
          '" aria-pressed="',
          String(heroId === selectedHero),
          '"><img src="',
          avatar(heroId),
          '" alt=""/><span><strong>',
          option.name,
          "</strong><small>R ",
          String(option.radius).replace(".", ","),
          "</small></span></button>",
        ].join("");
      }).join(""),
      "</div>",
      '<p class="arena-hero-select__physics"><strong>',
      hero.name.toUpperCase(),
      "</strong> · скорость 4,8398 ед./с · collision radius ",
      String(hero.radius).replace(".", ","),
      " · HotS 97.0.39</p>",
      "</section>",
    ].join("");
  };

  ArenaController.prototype.abilityRosterMarkup = function () {
    return [
      '<div class="arena-ability-roster">',
      TANK_ROSTER[this.selectedHero].abilities
        .map(function (ability) {
          return [
            '<article><img src="',
            ability.icon,
            '" alt=""/><div><span>',
            ability.key.toUpperCase(),
            " · ",
            abilityShapeLabel(ability),
            "</span><strong>",
            ability.name,
            "</strong><small>",
            abilityGeometryLabel(ability),
            "</small><p>",
            ability.effect,
            "</p></div></article>",
          ].join("");
        })
        .join(""),
      "</div>",
    ].join("");
  };

  ArenaController.prototype.renderBrief = function (drill) {
    var self = this;
    var warmupLabel =
      this.warmup && this.warmup.active
        ? "ЭТАП " + (this.warmup.index + 1) + " / 5 · " + this.duration + " СЕК"
        : drill.index + " / " + drill.kicker + " · " + this.duration + " СЕК";
    var selectable = this.drillId === "ability" || this.drillId === "bodyblock";
    var steps = drill.steps || [];
    this.brief.innerHTML = [
      '<div class="arena-brief__head">',
      '<img class="arena-brief__icon" src="',
      drill.icon,
      '" alt="',
      drill.title,
      '"/>',
      "<div><span>",
      warmupLabel,
      ' · СБОРКА 97.0.39</span><h2 id="arena-title">',
      drill.title,
      "</h2></div>",
      "</div>",
      selectable ? this.heroSelectorMarkup() : "",
      this.drillId === "ability" ? this.abilityRosterMarkup() : "",
      '<div class="arena-brief__guide">',
      '<section><div class="arena-guide__label">ЦЕЛЬ</div><p>',
      drill.description,
      "</p></section>",
      '<section><div class="arena-guide__label">УПРАВЛЕНИЕ</div><p>',
      drill.controls || "Следуй подсказкам на арене.",
      "</p></section>",
      '<section><div class="arena-guide__label">КАК ИГРАТЬ</div><ol>',
      steps
        .map(function (step) {
          return "<li>" + step + "</li>";
        })
        .join(""),
      "</ol></section>",
      '<section><div class="arena-guide__label">СЧЁТ</div><ul>',
      drill.scoring
        .map(function (item) {
          return "<li><b>" + item[0] + "</b>" + item[1] + "</li>";
        })
        .join(""),
      '</ul><p class="arena-guide__note">Время реакции измеряется от сигнала до команды и показывается отдельно.</p></section>',
      "</div>",
      '<div class="arena-brief__actions">',
      '<button class="mechanics-button" type="button" data-start-session>Начать сессию</button>',
      '<button class="mechanics-button mechanics-button--ghost" type="button" data-cancel-session>Вернуться</button>',
      "</div>",
    ].join("");
    this.brief.querySelectorAll("[data-select-hero]").forEach(function (button) {
      button.addEventListener("click", function () {
        self.selectedHero = button.getAttribute("data-select-hero");
        self.progress.selectedHero = self.selectedHero;
        saveProgress(self.progress);
        self.configureHud();
        self.renderBrief(drill);
        var selectedButton = self.brief.querySelector(
          '[data-select-hero="' + self.selectedHero + '"]',
        );
        try {
          selectedButton.focus({ preventScroll: true });
        } catch (_error) {
          selectedButton.focus();
        }
      });
    });
    this.brief
      .querySelector("[data-start-session]")
      .addEventListener("click", this.start.bind(this));
    this.brief
      .querySelector("[data-cancel-session]")
      .addEventListener("click", this.close.bind(this));
  };

  ArenaController.prototype.configureHud = function () {
    var hero = TANK_ROSTER[this.selectedHero] || TANK_ROSTER.muradin;
    var friendlyRoster = [hero.id]
      .concat(
        ["valla", "anduin", "johanna", "anubarak", "muradin"].filter(function (heroId) {
          return heroId !== hero.id;
        }),
      )
      .slice(0, 5);
    var enemyRoster = ["genji", "diablo", "garrosh", "l90etc", "arthas", "valla"]
      .filter(function (heroId) {
        return heroId !== hero.id;
      })
      .slice(0, 5);
    this.overlay
      .querySelectorAll(".team-strip:not(.team-strip--enemy) .team-strip__hero img")
      .forEach(function (image, index) {
        image.src = avatar(friendlyRoster[index]);
        image.alt = HERO_NAMES[friendlyRoster[index]] || friendlyRoster[index];
      });
    this.overlay
      .querySelectorAll(".team-strip--enemy .team-strip__hero img")
      .forEach(function (image, index) {
        image.src = avatar(enemyRoster[index]);
        image.alt = HERO_NAMES[enemyRoster[index]] || enemyRoster[index];
      });
    this.hudPortrait.src = avatar(hero.id);
    this.hudPortrait.alt = hero.name;
    this.hudHero.textContent = hero.name.toUpperCase() + " · УРОВЕНЬ 20";
    this.hudButtons.forEach(
      function (button, index) {
        var ability = hero.abilities[index];
        var image = button.querySelector("img");
        var key = button.querySelector("kbd");
        image.src = ability.icon;
        image.alt = ability.name;
        key.textContent = ability.key.toUpperCase();
        button.setAttribute("data-hud-key", ability.key);
        button.title = ability.name + " · " + abilityGeometryLabel(ability);
        button.classList.remove("is-current");
        button.disabled =
          this.drillId === "bodyblock" ||
          this.drillId === "switch" ||
          (this.drillId === "interrupt" && index > 0);
      }.bind(this),
    );
  };

  ArenaController.prototype.start = function () {
    if (this.phase !== "brief") return;
    this.brief.hidden = true;
    this.report.hidden = true;
    this.phase = "countdown";
    this.score = 0;
    this.stats = {};
    this.drillState = null;
    this.pausedTotal = 0;
    this.pausedAtReal = 0;
    this.countdownEnd = this.now() + 3000;
    this.lastGameNow = this.now();
    this.canvas.focus();
    this.queueFrame();
  };

  ArenaController.prototype.beginRun = function (now) {
    this.phase = "running";
    this.endGameAt = now + this.duration * 1000;
    this.lastGameNow = now;
    this.callout.textContent = "";
    if (this.drillId === "ability") this.initAbility(now);
    if (this.drillId === "switch") this.initSwitch(now);
    if (this.drillId === "interrupt") this.initInterrupt(now);
    if (this.drillId === "bodyblock") this.initBodyblock(now);
  };

  ArenaController.prototype.queueFrame = function () {
    if (this.animationFrame || document.hidden) return;
    this.animationFrame = requestAnimationFrame(this.frame.bind(this));
  };

  ArenaController.prototype.cancelFrame = function () {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  };

  ArenaController.prototype.frame = function (realNow) {
    this.animationFrame = 0;
    if (this.phase !== "running" && this.phase !== "countdown") return;
    var now = this.now(realNow);
    var delta = clamp(now - this.lastGameNow, 0, 50);
    this.lastGameNow = now;
    this.clearCanvas();

    if (this.phase === "countdown") {
      var left = this.countdownEnd - now;
      this.renderIdle();
      this.callout.innerHTML =
        left > 0
          ? "ГОТОВНОСТЬ · <b>" + Math.max(1, Math.ceil(left / 1000)) + "</b>"
          : "";
      if (left <= 0) this.beginRun(now);
    }

    if (this.phase === "running") {
      var remaining = this.endGameAt - now;
      this.timeElement.textContent = formatTime(remaining);
      if (remaining <= 0) {
        this.finish();
        return;
      }
      if (this.drillId === "ability") this.updateAbility(now, delta);
      if (this.drillId === "switch") this.updateSwitch(now, delta);
      if (this.drillId === "interrupt") this.updateInterrupt(now, delta);
      if (this.drillId === "bodyblock") this.updateBodyblock(now, delta);
    }
    this.queueFrame();
  };

  ArenaController.prototype.clearCanvas = function () {
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.context.clearRect(0, 0, this.width, this.height);
  };

  ArenaController.prototype.setScore = function (value) {
    this.score = Math.round(value);
    this.scoreElement.textContent = formatNumber(this.score);
  };

  ArenaController.prototype.addScore = function (amount) {
    this.setScore(this.score + amount);
  };

  ArenaController.prototype.resetReactionTelemetry = function (parameter) {
    this.reactionValues = [];
    this.reactionElement.textContent = "—";
    this.bestReactionElement.textContent = "—";
    this.parameterElement.textContent = parameter || "97.0.39";
  };

  ArenaController.prototype.recordReaction = function (milliseconds, parameter) {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) return "—";
    var rounded = Math.round(milliseconds);
    this.reactionValues.push(rounded);
    this.reactionElement.textContent = rounded + " мс";
    this.bestReactionElement.textContent =
      Math.min.apply(Math, this.reactionValues) + " мс";
    if (parameter) this.parameterElement.textContent = parameter;
    return rounded + " мс";
  };

  ArenaController.prototype.showFeedback = function (text, positive) {
    var self = this;
    window.clearTimeout(this.feedbackTimer);
    this.feedback.textContent = text;
    this.feedback.style.color = positive
      ? "var(--mechanics-gold)"
      : "var(--mechanics-enemy)";
    this.feedback.classList.remove("is-visible");
    void this.feedback.offsetWidth;
    this.feedback.classList.add("is-visible");
    this.feedbackTimer = window.setTimeout(function () {
      self.feedback.classList.remove("is-visible");
    }, 720);
  };

  ArenaController.prototype.image = function (url) {
    var image = this.images.get(url);
    return image && image.complete && image.naturalWidth ? image : null;
  };

  ArenaController.prototype.drawPortrait = function (
    url,
    x,
    y,
    radius,
    options,
  ) {
    options = options || {};
    var context = this.context;
    var image = this.image(url);
    context.save();
    context.translate(x, y);
    if (options.shadow) {
      context.shadowColor = "rgba(5, 8, 11, 0.65)";
      context.shadowBlur = 18;
      context.shadowOffsetY = 8;
    }
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.clip();
    if (image) {
      context.drawImage(image, -radius, -radius, radius * 2, radius * 2);
    } else {
      context.fillStyle = options.fill || "#25313b";
      context.fillRect(-radius, -radius, radius * 2, radius * 2);
      context.fillStyle = "#eef2f1";
      context.font = "800 " + Math.max(10, radius * 0.42) + "px Segoe UI, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(options.initials || "MT", 0, 0);
    }
    context.restore();
    context.save();
    context.strokeStyle = options.ring || "#73a8bf";
    context.lineWidth = options.lineWidth || 3;
    context.beginPath();
    context.arc(x, y, radius + 2, 0, Math.PI * 2);
    context.stroke();
    if (options.health !== undefined) {
      context.strokeStyle = "rgba(8, 12, 16, 0.8)";
      context.lineWidth = 7;
      context.beginPath();
      context.arc(x, y, radius + 9, Math.PI, Math.PI * 2);
      context.stroke();
      context.strokeStyle = options.ring || "#73a8bf";
      context.beginPath();
      context.arc(
        x,
        y,
        radius + 9,
        Math.PI,
        Math.PI + Math.PI * clamp(options.health, 0, 1),
      );
      context.stroke();
    }
    context.restore();
  };

  ArenaController.prototype.drawNameplate = function (
    text,
    x,
    y,
    enemy,
  ) {
    var context = this.context;
    context.save();
    context.font = "800 10px Segoe UI, sans-serif";
    var width = Math.max(72, context.measureText(text).width + 22);
    context.fillStyle = "rgba(12, 18, 24, 0.88)";
    context.strokeStyle = enemy ? "#b85d61" : "#73a8bf";
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(x - width / 2, y, width, 22, 5);
    context.fill();
    context.stroke();
    context.fillStyle = "#eef2f1";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, x, y + 11);
    context.restore();
  };

  ArenaController.prototype.renderArenaGrid = function () {
    var context = this.context;
    context.save();
    context.strokeStyle = "rgba(217, 228, 233, 0.07)";
    context.lineWidth = 1;
    var step = Math.max(54, Math.min(this.width, this.height) / 8);
    for (var x = step; x < this.width; x += step) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, this.height);
      context.stroke();
    }
    for (var y = step; y < this.height; y += step) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(this.width, y);
      context.stroke();
    }
    context.restore();
  };

  ArenaController.prototype.renderIdle = function () {
    this.clearCanvas();
    this.renderArenaGrid();
    var context = this.context;
    var x = this.width * 0.5;
    var y = this.height * 0.56;
    context.save();
    context.strokeStyle = "rgba(197, 173, 118, 0.35)";
    context.lineWidth = 2;
    context.setLineDash([8, 8]);
    context.beginPath();
    context.arc(x, y, Math.min(this.width, this.height) * 0.18, 0, Math.PI * 2);
    context.stroke();
    context.restore();
    this.drawPortrait(avatar("muradin"), x, y, 38, {
      ring: "#73a8bf",
      shadow: true,
      initials: "MT",
    });
  };

  ArenaController.prototype.useHudKey = function (key) {
    if (this.phase !== "running") return;
    if (this.drillId === "ability" && this.drillState && this.drillState.round) {
      if (this.drillState.round.ability.key !== key) {
        this.showFeedback(
          "СЕЙЧАС · " + this.drillState.round.ability.key.toUpperCase(),
          false,
        );
        return;
      }
      var point = this.pointer.active
        ? { x: this.pointer.x, y: this.pointer.y }
        : this.abilityTankPoint();
      this.handleAbilityShot(point, key);
    }
    if (this.drillId === "interrupt" && key === "q") this.handleInterrupt();
  };

  var ABILITY_ROUNDS = [
    {
      label: "МУРАДИН Q",
      icon: ABILITIES.muradin,
      caster: "muradin",
      targetPool: ["genji", "diablo", "garrosh"],
    },
    {
      label: "АНУБ'АРАК Q",
      icon: ABILITIES.anubarak,
      caster: "anubarak",
      targetPool: ["genji", "l90etc", "arthas"],
    },
    {
      label: "ДИАБЛО Q",
      icon: ABILITIES.diablo,
      caster: "diablo",
      targetPool: ["genji", "garrosh", "l90etc"],
    },
    {
      label: "ГАРРОШ E",
      icon: ABILITIES.garrosh,
      caster: "garrosh",
      targetPool: ["genji", "diablo", "arthas"],
    },
  ];

  ArenaController.prototype.initAbility = function (now) {
    this.stats = {
      shots: 0,
      hits: 0,
      misses: 0,
      wrong: 0,
      priorityHits: 0,
      centerTotal: 0,
      reactionTotal: 0,
      targetReactionTotal: 0,
      decisionReactionTotal: 0,
    };
    this.drillState = {
      round: null,
      targets: [],
      trail: null,
      nextRoundAt: now,
      noise: [],
    };
    this.spawnAbilityRound(now);
  };

  ArenaController.prototype.spawnAbilityRound = function (now) {
    var state = this.drillState;
    var scenario = choose(ABILITY_ROUNDS);
    var correctHero = choose(scenario.targetPool);
    var roster = [correctHero, "johanna", "genji", "anduin", "garrosh"];
    var seen = {};
    roster = roster.filter(function (hero) {
      if (seen[hero]) return false;
      seen[hero] = true;
      return true;
    });
    while (roster.length < 4) {
      var fallback = choose(["diablo", "garrosh", "l90etc", "arthas"]);
      if (!seen[fallback]) {
        seen[fallback] = true;
        roster.push(fallback);
      }
    }

    var targets = [];
    var minimumX = Math.max(48, this.width * 0.08);
    var maximumX = Math.max(minimumX + 1, this.width * 0.92);
    var minimumY = Math.max(90, this.height * 0.2);
    var maximumY = Math.max(minimumY + 1, this.height * 0.68);
    var self = this;

    roster.slice(0, 4).forEach(function (hero, index) {
      var radius = randomBetween(27, 38);
      var point = null;
      for (var attempt = 0; attempt < 30; attempt += 1) {
        var candidate = {
          x: randomBetween(minimumX, maximumX),
          y: randomBetween(minimumY, maximumY),
        };
        var clear = targets.every(function (target) {
          return distance(candidate, target) > radius + target.radius + 38;
        });
        if (clear) {
          point = candidate;
          break;
        }
      }
      if (!point) {
        point = {
          x: minimumX + ((maximumX - minimumX) / 4) * (index + 0.5),
          y: minimumY + ((index % 2) * (maximumY - minimumY)) / 2,
        };
      }
      var moving = index !== 1 && Math.random() > 0.46;
      targets.push({
        hero: hero,
        x: point.x,
        y: point.y,
        radius: radius,
        correct: hero === correctHero,
        ally: hero === "anduin" && hero !== correctHero,
        forbidden: hero === "johanna" && hero !== correctHero,
        vx: moving ? randomBetween(-46, 46) : 0,
        vy: moving ? randomBetween(-28, 28) : 0,
      });
    });

    state.targets = targets;
    state.round = {
      scenario: scenario,
      correctHero: correctHero,
      startAt: now,
      deadline:
        now +
        Math.max(880, 1740 - (this.difficulty - 1) * 170),
      resolved: false,
    };
    state.nextRoundAt = Infinity;
    state.noise = Array.from({ length: 10 }, function () {
      return {
        x: randomBetween(0, self.width),
        y: randomBetween(self.height * 0.18, self.height * 0.72),
        radius: randomBetween(12, 42),
        alpha: randomBetween(0.025, 0.09),
      };
    });
    this.callout.innerHTML =
      scenario.label + " → <b>" + HERO_NAMES[correctHero].toUpperCase() + "</b>";
    this.contextText.textContent =
      "Попади в центр приоритетной цели. Синяя рамка — союзник; щит — цель без окна.";
    var firstAbility = this.hudButtons[0].querySelector("img");
    firstAbility.src = scenario.icon;
    firstAbility.alt = scenario.label;
  };

  ArenaController.prototype.resolveAbilityRound = function (now) {
    this.drillState.round.resolved = true;
    this.drillState.nextRoundAt = now + 260;
  };

  ArenaController.prototype.handleAbilityShot = function (point) {
    var state = this.drillState;
    if (!state || !state.round || state.round.resolved) return;
    var now = this.now();
    var hit = null;
    state.targets.forEach(function (target) {
      if (distance(point, target) <= target.radius && !hit) hit = target;
    });

    this.stats.shots += 1;
    state.trail = {
      from: { x: this.width * 0.5, y: this.height * 0.84 },
      to: point,
      expires: now + 260,
      positive: Boolean(hit && hit.correct),
    };

    if (!hit) {
      this.stats.misses += 1;
      this.addScore(-40);
      this.showFeedback("ПРОМАХ · −40", false);
    } else if (!hit.correct) {
      this.stats.wrong += 1;
      this.addScore(-100);
      this.showFeedback(
        hit.ally ? "СОЮЗНИК · −100" : "НЕВЕРНАЯ ЦЕЛЬ · −100",
        false,
      );
    } else {
      var offset = distance(point, hit);
      var center = clamp(1 - offset / hit.radius, 0, 1);
      var centerBonus = Math.round(center * 50);
      var award = 100 + 75 + centerBonus;
      this.stats.hits += 1;
      this.stats.priorityHits += 1;
      this.stats.centerTotal += center * 100;
      this.stats.reactionTotal += now - state.round.startAt;
      this.addScore(award);
      this.showFeedback("ПОПАДАНИЕ · +" + award, true);
    }
    this.resolveAbilityRound(now);
  };

  ArenaController.prototype.updateAbility = function (now, delta) {
    var state = this.drillState;
    if (!state || !state.round) return;

    if (!state.round.resolved && now >= state.round.deadline) {
      this.stats.shots += 1;
      this.stats.misses += 1;
      this.addScore(-40);
      this.showFeedback("ОКНО ЗАКРЫТО · −40", false);
      this.resolveAbilityRound(now);
    }
    if (state.round.resolved && now >= state.nextRoundAt) {
      this.spawnAbilityRound(now);
    }

    var seconds = delta / 1000;
    state.targets.forEach(
      function (target) {
        target.x += target.vx * seconds;
        target.y += target.vy * seconds;
        var left = target.radius + 18;
        var right = this.width - target.radius - 18;
        var top = Math.max(82, this.height * 0.16);
        var bottom = this.height * 0.72;
        if (target.x < left || target.x > right) {
          target.x = clamp(target.x, left, right);
          target.vx *= -1;
        }
        if (target.y < top || target.y > bottom) {
          target.y = clamp(target.y, top, bottom);
          target.vy *= -1;
        }
      }.bind(this),
    );
    this.renderAbility(now);
  };

  ArenaController.prototype.renderAbility = function (now) {
    var state = this.drillState;
    var context = this.context;
    this.renderArenaGrid();

    state.noise.forEach(function (particle) {
      context.fillStyle = "rgba(205, 219, 225, " + particle.alpha + ")";
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();
    });

    var tank = { x: this.width * 0.5, y: this.height * 0.84 };
    if (this.pointer.active) {
      context.save();
      context.strokeStyle = "rgba(197, 173, 118, 0.42)";
      context.lineWidth = 3;
      context.setLineDash([10, 8]);
      context.beginPath();
      context.moveTo(tank.x, tank.y);
      context.lineTo(this.pointer.x, this.pointer.y);
      context.stroke();
      context.restore();
    }

    if (state.trail && now < state.trail.expires) {
      var life = (state.trail.expires - now) / 260;
      context.save();
      context.strokeStyle = state.trail.positive
        ? "rgba(197, 173, 118, " + life + ")"
        : "rgba(184, 93, 97, " + life + ")";
      context.lineWidth = 7;
      context.beginPath();
      context.moveTo(state.trail.from.x, state.trail.from.y);
      context.lineTo(state.trail.to.x, state.trail.to.y);
      context.stroke();
      context.restore();
    }

    state.targets.forEach(
      function (target) {
        var ring = target.ally
          ? "#73a8bf"
          : target.correct
            ? "#c5ad76"
            : "#b85d61";
        this.drawPortrait(avatar(target.hero), target.x, target.y, target.radius, {
          ring: ring,
          health: 0.72,
          shadow: true,
          initials: (HERO_NAMES[target.hero] || "EN").slice(0, 2),
        });
        this.drawNameplate(
          target.correct
            ? "ПРИОРИТЕТ · " + HERO_NAMES[target.hero]
            : HERO_NAMES[target.hero],
          target.x,
          target.y + target.radius + 13,
          !target.ally,
        );
        if (target.forbidden) {
          context.save();
          context.fillStyle = "rgba(197, 173, 118, 0.95)";
          context.font = "900 15px Segoe UI, sans-serif";
          context.textAlign = "center";
          context.fillText("ЩИТ", target.x, target.y - target.radius - 15);
          context.restore();
        }
      }.bind(this),
    );

    this.drawPortrait(avatar("muradin"), tank.x, tank.y, 34, {
      ring: "#73a8bf",
      shadow: true,
      initials: "MT",
    });
    this.drawNameplate("ВЫ · МУРАДИН", tank.x, tank.y + 47, false);
  };

  /* Hero-specific Ability Placement. Geometry is normalized from the local
     HotS 97.0.39 data export and rendered in world-unit scale. */
  ArenaController.prototype.arenaUnitScale = function () {
    return clamp(Math.min(this.width / 32, this.height / 18), 18, 34);
  };

  ArenaController.prototype.abilityTankPoint = function () {
    if (
      this.drillId === "ability" &&
      this.drillState &&
      this.drillState.tank
    ) {
      return this.drillState.tank;
    }
    return { x: this.width * 0.5, y: this.height * 0.82 };
  };

  ArenaController.prototype.issueAbilityMove = function (point, now, continuous) {
    var state = this.drillState;
    if (!state || !state.tank || !state.round || now < state.round.activeAt) {
      if (!continuous) this.showFeedback("СНАЧАЛА ПРОЧИТАЙ ЗАДАНИЕ", false);
      return;
    }
    var route = buildVisibilityRoute(
      state.tank,
      point,
      state.obstacles || [],
      state.tank.radius,
      this.width,
      this.height,
    );
    state.moveTarget.x = route.destination.x;
    state.moveTarget.y = route.destination.y;
    state.movePath = route.waypoints;
    state.commandMarkerUntil = now + 700;
    this.lastBodyCommandAt = now;
    if (!continuous) {
      this.showFeedback(
        route.projected ? "ТОЧКА СКОРРЕКТИРОВАНА · ПУТЬ ПОСТРОЕН" : "ПКМ · ПУТЬ ПОСТРОЕН",
        !route.projected,
      );
    }
  };

  function cappedPoint(from, to, maximumDistance) {
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    var length = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
    var scale = Math.min(1, maximumDistance / length);
    return { x: from.x + dx * scale, y: from.y + dy * scale };
  }

  function pointSegmentMetrics(point, start, end) {
    var dx = end.x - start.x;
    var dy = end.y - start.y;
    var lengthSquared = Math.max(0.001, dx * dx + dy * dy);
    var amount = clamp(
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
      0,
      1,
    );
    var nearest = { x: start.x + dx * amount, y: start.y + dy * amount };
    return {
      distance: distance(point, nearest),
      amount: amount,
      along: Math.sqrt(lengthSquared) * amount,
      nearest: nearest,
    };
  }

  function pointRectangleDistance(point, rectangle) {
    var x = clamp(point.x, rectangle.x, rectangle.x + rectangle.width);
    var y = clamp(point.y, rectangle.y, rectangle.y + rectangle.height);
    return distance(point, { x: x, y: y });
  }

  ArenaController.prototype.initAbility = function (now) {
    this.stats = {
      shots: 0,
      hits: 0,
      misses: 0,
      wrong: 0,
      priorityHits: 0,
      centerTotal: 0,
      reactionTotal: 0,
      reactionCount: 0,
      bestReaction: Infinity,
      byAbility: {},
    };
    this.drillState = {
      round: null,
      targets: [],
      tank: {
        x: this.width * 0.5,
        y: this.height * 0.82,
        radius: (TANK_ROSTER[this.selectedHero].radius || 0.75) * this.arenaUnitScale(),
      },
      moveTarget: { x: this.width * 0.5, y: this.height * 0.82 },
      movePath: [],
      commandMarkerUntil: 0,
      obstacles: [
        { x: this.width * 0.18, y: this.height * 0.48, width: this.width * 0.18, height: 34 },
        { x: this.width * 0.64, y: this.height * 0.55, width: this.width * 0.17, height: 38 },
      ],
      trail: null,
      nextRoundAt: now,
      noise: [],
      wall: null,
      abilityIndex: 0,
      pendingEffect: null,
      casterVisual: null,
      casterEffect: null,
    };
    this.spawnAbilityRound(now);
  };

  ArenaController.prototype.spawnAbilityRound = function (now) {
    var state = this.drillState;
    var hero = TANK_ROSTER[this.selectedHero];
    var ability = hero.abilities[state.abilityIndex % hero.abilities.length];
    state.abilityIndex += 1;
    var unitScale = this.arenaUnitScale();
    var tank = this.abilityTankPoint();
    var tankRadius = hero.radius * unitScale;
    state.tank.radius = tankRadius;
    var targetPool = ["genji", "diablo", "garrosh", "l90etc", "arthas", "valla"]
      .filter(function (targetHero) {
        return targetHero !== hero.id;
      });
    var correctHero = ability.defensive
      ? "valla"
      : ability.supportive
        ? "anduin"
        : choose(targetPool);
    var roster = [correctHero, "johanna", "anduin", choose(targetPool)];
    var seen = {};
    roster = roster.filter(function (targetHero) {
      if (seen[targetHero]) return false;
      seen[targetHero] = true;
      return true;
    });
    while (roster.length < 4) {
      var fallback = choose(targetPool);
      if (!seen[fallback]) {
        seen[fallback] = true;
        roster.push(fallback);
      }
    }

    state.wall = ability.wall
      ? {
          x: this.width * 0.69,
          y: this.height * 0.21,
          width: Math.max(20, unitScale * 0.72),
          height: this.height * 0.43,
        }
      : null;

    var targets = [];
    var self = this;
    roster.slice(0, 4).forEach(function (targetHero, index) {
      var radius = (HERO_RADII[targetHero] || 0.75) * unitScale;
      var correct = targetHero === correctHero;
      var point = null;
      if (correct && ability.defensive) {
        point = {
          x: self.width * 0.76,
          y: self.height * 0.28,
        };
      } else if (correct) {
        var centerRange = ability.range * unitScale;
        if (ability.shape === "target") centerRange += tankRadius + radius;
        if (state.wall) {
          point = {
            x: state.wall.x - radius - 7,
            y: clamp(
              tank.y - centerRange * 0.62,
              self.height * 0.27,
              state.wall.y + state.wall.height - radius - 8,
            ),
          };
        } else {
          var angle = randomBetween(-2.22, -0.92);
          var minimumRange = ability.minimumRange
            ? ability.minimumRange * unitScale
            : Math.min(centerRange * 0.58, Math.max(38, centerRange - 24));
          var placementRange = randomBetween(
            Math.max(30, minimumRange),
            Math.max(Math.max(30, minimumRange) + 2, centerRange * (ability.minimumRange ? 0.97 : 0.82)),
          );
          point = {
            x: tank.x + Math.cos(angle) * placementRange,
            y: tank.y + Math.sin(angle) * placementRange,
          };
        }
      }
      for (var attempt = 0; !point && attempt < 40; attempt += 1) {
        var candidate = {
          x: randomBetween(Math.max(40, radius + 18), self.width - radius - 28),
          y: randomBetween(Math.max(92, self.height * 0.2), self.height * 0.68),
        };
        if (
          distance(candidate, tank) > tankRadius + radius + 14 &&
          targets.every(function (target) {
            return distance(candidate, target) > radius + target.radius + 22;
          })
        ) {
          point = candidate;
        }
      }
      if (!point) {
        point = {
          x: self.width * (0.2 + index * 0.19),
          y: self.height * (0.3 + (index % 2) * 0.22),
        };
      }
      point.x = clamp(point.x, radius + 18, self.width - radius - 18);
      point.y = clamp(point.y, radius + 80, self.height * 0.7);
      var moving =
        !ability.defensive &&
        correct &&
        (ability.castDelay >= 0.2 || ability.projectileSpeed);
      targets.push({
        hero: targetHero,
        x: point.x,
        y: point.y,
        radius: radius,
        correct: correct,
        ally: targetHero === "anduin",
        forbidden: targetHero === "johanna" && !correct,
        vx: moving ? randomBetween(-34, 34) : index > 1 ? randomBetween(-18, 18) : 0,
        vy: moving ? randomBetween(-16, 16) : 0,
      });
    });

    state.targets = targets;
    state.pendingEffect = null;
    state.casterVisual = null;
    state.casterEffect = null;
    state.effectPulse = null;
    var activeAt = now + 3600;
    var threatCueAt = ability.defensive ? activeAt + 500 : 0;
    var threatImpactAt = ability.defensive ? threatCueAt + 980 : 0;
    var taskCallout = ability.defensive
      ? hero.name.toUpperCase() +
        " " +
        ability.key.toUpperCase() +
        " · " +
        ability.name.toUpperCase() +
        " → <b>ЗАЩИТИСЬ ОТ ВЫСТРЕЛА</b>"
      : hero.name.toUpperCase() +
        " " +
        ability.key.toUpperCase() +
        " · " +
        ability.name.toUpperCase() +
        " → <b>" +
        (ability.supportive ? "СОЮЗНИК · " : "ВРАГ · ") +
        HERO_NAMES[correctHero].toUpperCase() +
        "</b>";
    var taskContext = ability.defensive
      ? "SELF-CAST · дождись красного снаряда и нажми " +
        ability.key.toUpperCase() +
        " в золотое окно перед попаданием."
      : "ПКМ — движение · " +
        abilityShapeLabel(ability) +
        " · " +
        abilityGeometryLabel(ability) +
        ". " +
        ability.effect;
    state.round = {
      hero: hero,
      ability: ability,
      correctHero: correctHero,
      startAt: activeAt,
      activeAt: activeAt,
      activated: false,
      taskCallout: taskCallout,
      taskContext: taskContext,
      cueAt: threatCueAt,
      impactAt: threatImpactAt,
      windowStart: ability.defensive
        ? threatImpactAt - (ability.timingWindow || 0.42) * 1000
        : 0,
      windowEnd: ability.defensive ? threatImpactAt : 0,
      deadline: ability.defensive
        ? threatImpactAt + 180
        : activeAt + Math.max(3600, 5000 - (this.difficulty - 1) * 240),
      resolved: false,
    };
    state.nextRoundAt = Infinity;
    state.noise = Array.from({ length: 10 }, function () {
      return {
        x: randomBetween(0, self.width),
        y: randomBetween(self.height * 0.18, self.height * 0.72),
        radius: randomBetween(12, 42),
        alpha: randomBetween(0.025, 0.075),
      };
    });
    this.callout.innerHTML = "ПОДГОТОВКА · <b>ПРОЧИТАЙ ЗАДАНИЕ</b>";
    this.contextText.textContent =
      hero.name +
      " · " +
      ability.key.toUpperCase() +
      " · " +
      ability.name +
      ". " +
      taskContext;
    this.parameterElement.textContent = ability.defensive
      ? ability.key.toUpperCase() +
        " · ОКНО " +
        Math.round((ability.timingWindow || 0.42) * 1000) +
        " МС"
      : ability.key.toUpperCase() +
        " · RANGE " +
        String(ability.range).replace(".", ",");
    this.hudHint.textContent = ability.effect;
    this.hudButtons.forEach(function (button) {
      button.classList.toggle(
        "is-current",
        button.getAttribute("data-hud-key") === ability.key,
      );
    });
  };

  ArenaController.prototype.abilityImpactDelay = function (ability, target, tank) {
    var delay = ability.castDelay || 0;
    if (ability.projectileSpeed) {
      delay += distance(tank, target) / this.arenaUnitScale() / ability.projectileSpeed;
    }
    return delay;
  };

  ArenaController.prototype.predictedAbilityTarget = function (target, ability, tank) {
    var delay = this.abilityImpactDelay(ability, target, tank);
    return {
      x: target.x + target.vx * delay,
      y: target.y + target.vy * delay,
      radius: target.radius,
    };
  };

  ArenaController.prototype.markAbilityTarget = function (
    target,
    label,
    now,
    duration,
    motionScale,
  ) {
    if (!target) return;
    target.effectLabel = label;
    target.effectUntil = now + (duration || 760);
    target.effectMotionScale = motionScale === undefined ? 1 : motionScale;
  };

  ArenaController.prototype.moveAbilityTarget = function (target, point) {
    if (!target || !point) return;
    target.x = clamp(point.x, target.radius + 18, this.width - target.radius - 18);
    target.y = clamp(
      point.y,
      target.radius + 80,
      this.height - target.radius - 18,
    );
  };

  ArenaController.prototype.applyAbilityEffect = function (pending, now) {
    var state = this.drillState;
    if (!state || !pending || pending.applied) return;
    pending.applied = true;
    var ability = pending.ability;
    var result = pending.result;
    var tank = pending.tank;
    var unitScale = this.arenaUnitScale();
    var primary = result.hit ? result.hit.target : null;
    var affected = (result.effectHits || [])
      .map(function (candidate) {
        return candidate.target;
      })
      .filter(function (target, index, targets) {
        return targets.indexOf(target) === index;
      });
    var self = this;
    var direction = primary
      ? normalizeVector(primary.x - tank.x, primary.y - tank.y)
      : normalizeVector(pending.point.x - tank.x, pending.point.y - tank.y);
    var effectDuration = 860;

    if (ability.outcome === "stun") {
      this.markAbilityTarget(primary, "ОГЛУШЕНИЕ", now, effectDuration, 0);
    } else if (ability.outcome === "slow") {
      affected.forEach(function (target) {
        self.markAbilityTarget(target, "ЗАМЕДЛЕНИЕ", now, effectDuration, 0.35);
      });
    } else if (ability.outcome === "leap") {
      state.casterVisual = {
        x: result.aimEnd.x,
        y: result.aimEnd.y,
        until: now + effectDuration,
      };
      state.casterEffect = {
        label: "ПРЫЖОК",
        until: now + effectDuration,
      };
      state.tank.x = result.aimEnd.x;
      state.tank.y = result.aimEnd.y;
      state.moveTarget.x = state.tank.x;
      state.moveTarget.y = state.tank.y;
      state.movePath = [];
      affected.forEach(function (target) {
        self.markAbilityTarget(target, "ПРИЗЕМЛЕНИЕ", now, effectDuration, 0.55);
      });
    } else if (ability.outcome === "knockback" && primary) {
      this.moveAbilityTarget(primary, {
        x: primary.x + direction.x * 3.5 * unitScale,
        y: primary.y + direction.y * 3.5 * unitScale,
      });
      this.markAbilityTarget(primary, "ОТБРОШЕН", now, effectDuration, 0);
    } else if (ability.outcome === "knockup") {
      affected.forEach(function (target) {
        self.markAbilityTarget(target, "ПОДБРОШЕН", now, effectDuration, 0);
      });
    } else if (ability.outcome === "burrow") {
      state.casterVisual = {
        x: result.aimEnd.x,
        y: result.aimEnd.y,
        until: now + effectDuration,
      };
      state.casterEffect = {
        label: "ПОДЗЕМНЫЙ РЫВОК",
        until: now + effectDuration,
      };
      state.tank.x = result.aimEnd.x;
      state.tank.y = result.aimEnd.y;
      state.moveTarget.x = state.tank.x;
      state.moveTarget.y = state.tank.y;
      state.movePath = [];
      affected.forEach(function (target) {
        self.markAbilityTarget(target, "ПОДБРОШЕН", now, effectDuration, 0);
      });
    } else if (ability.outcome === "cocoon") {
      this.markAbilityTarget(primary, "КОКОН", now, effectDuration, 0);
    } else if (ability.outcome === "charge" && primary) {
      state.casterVisual = {
        x: primary.x - direction.x * (pending.hero.radius * unitScale + primary.radius + 4),
        y: primary.y - direction.y * (pending.hero.radius * unitScale + primary.radius + 4),
        until: now + effectDuration,
      };
      state.casterEffect = {
        label: "РЫВОК",
        until: now + effectDuration,
      };
      state.tank.x = state.casterVisual.x;
      state.tank.y = state.casterVisual.y;
      state.moveTarget.x = state.tank.x;
      state.moveTarget.y = state.tank.y;
      state.movePath = [];
      if (result.wallReady && state.wall) {
        this.moveAbilityTarget(primary, {
          x: state.wall.x - primary.radius - 4,
          y: primary.y,
        });
        this.markAbilityTarget(primary, "WALL STUN", now, effectDuration, 0);
      } else {
        this.markAbilityTarget(primary, "НАТИСК", now, effectDuration, 0.35);
      }
    } else if (ability.outcome === "burn") {
      affected.forEach(function (target) {
        self.markAbilityTarget(target, "ОГОНЬ · SLOW", now, effectDuration, 0.55);
      });
    } else if (ability.outcome === "flip" && primary) {
      this.moveAbilityTarget(primary, {
        x: tank.x - direction.x * (pending.hero.radius * unitScale + primary.radius + 8),
        y: tank.y - direction.y * (pending.hero.radius * unitScale + primary.radius + 8),
      });
      this.markAbilityTarget(primary, "ПЕРЕБРОШЕН", now, effectDuration, 0);
    } else if (ability.outcome === "channel") {
      state.casterEffect = {
        label: "КАНАЛ · НЕПОДВИЖЕН",
        until: now + effectDuration,
      };
      affected.forEach(function (target) {
        self.markAbilityTarget(target, "ДЫХАНИЕ · SLOW", now, effectDuration, 0.35);
      });
    } else if (ability.outcome === "pull") {
      affected.forEach(function (target) {
        var pullDirection = normalizeVector(target.x - tank.x, target.y - tank.y);
        self.moveAbilityTarget(target, {
          x:
            tank.x +
            pullDirection.x *
              (pending.hero.radius * unitScale + target.radius + 10),
          y:
            tank.y +
            pullDirection.y *
              (pending.hero.radius * unitScale + target.radius + 10),
        });
        self.markAbilityTarget(target, "ПРИТЯНУТ", now, effectDuration, 0);
      });
    } else if (ability.outcome === "selfHeal") {
      state.casterEffect = {
        label: "САМОЛЕЧЕНИЕ",
        until: now + effectDuration,
      };
      this.markAbilityTarget(primary, "УДАР", now, effectDuration, 0.7);
    } else if (ability.outcome === "throw" && primary) {
      this.moveAbilityTarget(primary, {
        x: tank.x,
        y: tank.y + 2.1 * unitScale,
      });
      this.markAbilityTarget(primary, "БРОШЕН В КОМАНДУ", now, effectDuration, 0);
    } else if (ability.outcome === "taunt") {
      affected.forEach(function (target) {
        self.markAbilityTarget(target, "ПРОВОКАЦИЯ", now, effectDuration, 0);
      });
    } else if (ability.outcome === "shield") {
      affected.forEach(function (target) {
        self.markAbilityTarget(target, "ЩИТ", now, effectDuration, 0.25);
      });
      state.casterEffect = {
        label: "ЩИТ КОМАНДЕ",
        until: now + effectDuration,
      };
    }
    state.effectPulse = {
      x: primary ? primary.x : result.aimEnd.x,
      y: primary ? primary.y : result.aimEnd.y,
      startedAt: now,
      expires: now + effectDuration,
      label: ability.effect,
    };
  };

  ArenaController.prototype.handleDefensiveAbility = function (now, sourceKey) {
    var state = this.drillState;
    var round = state.round;
    var ability = round.ability;
    if (sourceKey !== ability.key) {
      this.showFeedback("SELF-CAST · НАЖМИ " + ability.key.toUpperCase(), false);
      return;
    }
    if (now < round.cueAt) {
      this.showFeedback("ЖДИ СИГНАЛА УГРОЗЫ", false);
      return;
    }
    var reaction = now - round.cueAt;
    var reactionLabel = this.recordReaction(reaction, "W · ОКНО ЩИТА");
    var inWindow = now >= round.windowStart && now <= round.windowEnd;
    var idealAt = round.impactAt - 120;
    var quality = clamp(
      1 - Math.abs(now - idealAt) / Math.max(1, round.impactAt - round.windowStart),
      0,
      1,
    );
    this.stats.shots += 1;
    this.stats.reactionTotal += reaction;
    this.stats.reactionCount += 1;
    this.stats.bestReaction = Math.min(this.stats.bestReaction, reaction);
    this.stats.byAbility[ability.key] = (this.stats.byAbility[ability.key] || 0) + 1;
    var attacker = state.targets.find(function (target) {
      return target.correct;
    });
    state.trail = {
      from: attacker ? { x: attacker.x, y: attacker.y } : { x: this.width * 0.76, y: this.height * 0.28 },
      to: this.abilityTankPoint(),
      expires: now + 860,
      positive: inWindow,
      shape: "shield",
      radius: 2.4,
    };
    if (inWindow) {
      var timingBonus = Math.round(quality * 50);
      var award = 175 + timingBonus;
      this.stats.hits += 1;
      this.stats.priorityHits += 1;
      this.stats.centerTotal += quality * 100;
      this.addScore(award);
      state.casterEffect = {
        label: "ЩИТ · УРОН ПОГЛОЩЁН",
        until: now + 860,
      };
      this.markAbilityTarget(attacker, "СНАРЯД ПОГЛОЩЁН", now, 860, 1);
      this.showFeedback("ЩИТ ВОВРЕМЯ · +" + award + " · " + reactionLabel, true);
    } else {
      this.stats.misses += 1;
      this.addScore(-40);
      state.casterEffect = {
        label: now < round.windowStart ? "ЩИТ СЛИШКОМ РАНО" : "УРОН ПРОШЁЛ",
        until: now + 860,
      };
      this.showFeedback(
        (now < round.windowStart ? "СЛИШКОМ РАНО" : "СЛИШКОМ ПОЗДНО") +
          " · −40 · " +
          reactionLabel,
        false,
      );
    }
    this.resolveAbilityRound(now, 900);
  };

  ArenaController.prototype.evaluateAbilityShot = function (point) {
    var state = this.drillState;
    var round = state.round;
    var ability = round.ability;
    var tank = this.abilityTankPoint();
    var unitScale = this.arenaUnitScale();
    var maximumRange = ability.range * unitScale;
    var aimEnd = cappedPoint(tank, point, maximumRange);
    var pointDistance = distance(tank, point);
    var candidates = [];
    var outOfRange = false;

    state.targets.forEach(
      function (target) {
        var predicted = this.predictedAbilityTarget(target, ability, tank);
        var hit = false;
        var quality = 0;
        var order = distance(tank, predicted);
        if (ability.shape === "line") {
          var line = pointSegmentMetrics(predicted, tank, aimEnd);
          var halfWidth = (ability.width * unitScale) / 2;
          hit =
            line.distance <= halfWidth + target.radius &&
            line.along <= maximumRange + target.radius &&
            line.amount > 0.01;
          quality = clamp(1 - line.distance / Math.max(1, halfWidth + target.radius), 0, 1);
          order = line.along;
        } else if (ability.shape === "area") {
          outOfRange = pointDistance > maximumRange + 3;
          var effectRadius = (ability.radius || 1.5) * unitScale;
          hit = !outOfRange && distance(point, predicted) <= effectRadius + target.radius;
          quality = clamp(
            1 - distance(point, predicted) / Math.max(1, effectRadius + target.radius),
            0,
            1,
          );
        } else if (ability.shape === "cone") {
          var aimAngle = Math.atan2(point.y - tank.y, point.x - tank.x);
          var targetAngle = Math.atan2(predicted.y - tank.y, predicted.x - tank.x);
          var angleDifference = Math.abs(
            Math.atan2(Math.sin(targetAngle - aimAngle), Math.cos(targetAngle - aimAngle)),
          );
          var halfAngle = ((ability.angle || 45) * Math.PI) / 360;
          var targetDistance = distance(tank, predicted);
          var radiusAngle = Math.asin(clamp(target.radius / Math.max(target.radius, targetDistance), 0, 1));
          var minimumConeRange = (ability.minimumRange || 0) * unitScale;
          hit =
            targetDistance <= maximumRange + target.radius &&
            targetDistance >= Math.max(0, minimumConeRange - target.radius) &&
            angleDifference <= halfAngle + radiusAngle;
          quality = clamp(1 - angleDifference / Math.max(0.01, halfAngle + radiusAngle), 0, 1);
          if (ability.minimumRange) {
            var bandCenter = (maximumRange + minimumConeRange) / 2;
            var bandHalfWidth = (maximumRange - minimumConeRange) / 2 + target.radius;
            quality *= clamp(1 - Math.abs(targetDistance - bandCenter) / bandHalfWidth, 0, 1);
          }
        } else if (ability.shape === "self") {
          var selfDistance = distance(tank, predicted);
          hit = selfDistance <= maximumRange + target.radius;
          quality = clamp(1 - selfDistance / Math.max(1, maximumRange + target.radius), 0, 1);
        } else {
          var castLimit = maximumRange + round.hero.radius * unitScale + target.radius;
          var clickOffset = distance(point, target);
          hit = clickOffset <= target.radius && distance(tank, target) <= castLimit;
          outOfRange =
            outOfRange ||
            (clickOffset <= target.radius && distance(tank, target) > castLimit);
          quality = clamp(1 - clickOffset / Math.max(1, target.radius), 0, 1);
        }
        if (hit) {
          candidates.push({
            target: target,
            quality: quality,
            order: order,
            predicted: predicted,
            delay: this.abilityImpactDelay(ability, target, tank),
          });
        }
      }.bind(this),
    );

    if (ability.shape === "line" && !ability.pierces) {
      candidates.sort(function (left, right) {
        return left.order - right.order;
      });
      candidates = candidates.slice(0, 1);
    }
    var hit = candidates.find(function (candidate) {
      return candidate.target.correct;
    });
    if (!hit && candidates.length) hit = candidates[0];
    var wallReady =
      !ability.wall ||
      (hit && state.wall && pointRectangleDistance(hit.predicted, state.wall) <= hit.target.radius + 11);
    return {
      hit: hit,
      effectHits: candidates,
      outOfRange: outOfRange,
      wallReady: wallReady,
      aimEnd: ability.shape === "area" ? point : aimEnd,
      impactDelay: hit ? hit.delay : ability.castDelay || 0,
    };
  };

  ArenaController.prototype.resolveAbilityRound = function (now, holdMilliseconds) {
    this.drillState.round.resolved = true;
    this.drillState.nextRoundAt = now + (holdMilliseconds || 700);
  };

  ArenaController.prototype.handleAbilityShot = function (point, sourceKey) {
    var state = this.drillState;
    if (!state || !state.round || state.round.resolved) return;
    var now = this.now();
    if (now < state.round.activeAt) {
      this.showFeedback("ЗАДАНИЕ ЕЩЁ НЕ НАЧАЛОСЬ · ПРОЧИТАЙ УСЛОВИЕ", false);
      return;
    }
    if (state.round.ability.defensive) {
      this.handleDefensiveAbility(now, sourceKey);
      return;
    }
    var reaction = now - state.round.startAt;
    var reactionLabel = this.recordReaction(
      reaction,
      state.round.ability.key.toUpperCase() + " · " + abilityShapeLabel(state.round.ability),
    );
    var result = this.evaluateAbilityShot(point);
    var hit = result.hit;
    this.stats.shots += 1;
    this.stats.reactionTotal += reaction;
    this.stats.reactionCount += 1;
    this.stats.bestReaction = Math.min(this.stats.bestReaction, reaction);
    this.stats.byAbility[state.round.ability.key] =
      (this.stats.byAbility[state.round.ability.key] || 0) + 1;
    state.trail = {
      from: this.abilityTankPoint(),
      to: result.aimEnd,
      expires: now + Math.max(700, result.impactDelay * 1000 + 640),
      positive: Boolean(hit && hit.target.correct),
      shape: state.round.ability.shape,
      radius: state.round.ability.radius || state.round.ability.range,
    };

    if (hit) {
      state.pendingEffect = {
        at: now + result.impactDelay * 1000,
        applied: false,
        ability: state.round.ability,
        hero: state.round.hero,
        point: { x: point.x, y: point.y },
        tank: this.abilityTankPoint(),
        result: result,
      };
    }

    if (!hit) {
      this.stats.misses += 1;
      this.addScore(-40);
      this.showFeedback(
        (result.outOfRange ? "ВНЕ ДАЛЬНОСТИ" : "ПРОМАХ") +
          " · −40 · " +
          reactionLabel,
        false,
      );
    } else if (!hit.target.correct) {
      this.stats.wrong += 1;
      this.addScore(-100);
      this.showFeedback(
        (hit.target.ally ? "СОЮЗНИК" : "НЕВЕРНАЯ ЦЕЛЬ") +
          " · −100 · " +
          reactionLabel,
        false,
      );
    } else {
      var centerBonus = Math.round(hit.quality * 50);
      var effectBonus = state.round.ability.wall && result.wallReady ? 25 : 0;
      var priorityBonus = state.round.ability.wall && !result.wallReady ? 0 : 75;
      var award = 100 + centerBonus + priorityBonus + effectBonus;
      this.stats.hits += 1;
      this.stats.priorityHits += priorityBonus ? 1 : 0;
      this.stats.centerTotal += hit.quality * 100;
      this.addScore(award);
      this.showFeedback(
        (state.round.ability.wall && !result.wallReady ? "ПОПАДАНИЕ БЕЗ СТЕНЫ" : "ПОПАДАНИЕ") +
          " · +" +
          award +
          " · " +
          reactionLabel,
        true,
      );
    }
    this.resolveAbilityRound(
      now,
      Math.max(780, result.impactDelay * 1000 + 980),
    );
  };

  ArenaController.prototype.updateAbility = function (now, delta) {
    var state = this.drillState;
    if (!state || !state.round) return;
    var seconds = delta / 1000;
    state.tank.radius = state.round.hero.radius * this.arenaUnitScale();
    moveEntityAlongRoute(
      state.tank,
      state.movePath,
      state.round.hero.speed * this.arenaUnitScale(),
      seconds,
    );
    (state.obstacles || []).forEach(
      function (obstacle) {
        if (resolveCircleRect(state.tank, obstacle)) {
          var rebuilt = buildVisibilityRoute(
            state.tank,
            state.moveTarget,
            state.obstacles,
            state.tank.radius,
            this.width,
            this.height,
          );
          state.movePath = rebuilt.waypoints;
        }
      }.bind(this),
    );
    state.tank.x = clamp(state.tank.x, state.tank.radius + 18, this.width - state.tank.radius - 18);
    state.tank.y = clamp(state.tank.y, state.tank.radius + 82, this.height - state.tank.radius - 18);

    if (now < state.round.activeAt) {
      this.callout.innerHTML =
        "ПОДГОТОВКА · <b>" +
        Math.max(1, Math.ceil((state.round.activeAt - now) / 1000)) +
        "</b>";
      this.renderAbility(now);
      return;
    }
    if (!state.round.activated) {
      state.round.activated = true;
      this.callout.innerHTML = state.round.taskCallout;
      this.contextText.textContent = state.round.taskContext;
      this.showFeedback("СИТУАЦИЯ ОТКРЫТА · ПКМ ДВИЖЕНИЕ · ЛКМ КАСТ", true);
    }
    if (state.pendingEffect && !state.pendingEffect.applied && now >= state.pendingEffect.at) {
      this.applyAbilityEffect(state.pendingEffect, now);
    }
    if (
      state.round.ability.defensive &&
      !state.round.resolved &&
      now >= state.round.cueAt &&
      !state.round.cueShown
    ) {
      state.round.cueShown = true;
      this.contextText.textContent =
        "СИГНАЛ · снаряд летит в танка. Нажми W в золотое окно перед попаданием.";
    }
    if (!state.round.resolved && now >= state.round.deadline) {
      this.stats.shots += 1;
      this.stats.misses += 1;
      this.addScore(-40);
      if (state.round.ability.defensive) {
        var attacker = state.targets.find(function (target) {
          return target.correct;
        });
        state.trail = {
          from: attacker
            ? { x: attacker.x, y: attacker.y }
            : { x: this.width * 0.76, y: this.height * 0.28 },
          to: this.abilityTankPoint(),
          expires: now + 860,
          positive: false,
          shape: "shield",
          radius: 2.4,
        };
        state.casterEffect = {
          label: "УРОН ПРОШЁЛ",
          until: now + 860,
        };
        this.showFeedback("ЩИТ НЕ НАЖАТ · −40", false);
        this.resolveAbilityRound(now, 900);
      } else {
        this.showFeedback("ОКНО ЗАКРЫТО · −40", false);
        this.resolveAbilityRound(now);
      }
    }
    if (state.round.resolved && now >= state.nextRoundAt) this.spawnAbilityRound(now);

    state.targets.forEach(
      function (target) {
        var motionScale =
          target.effectUntil && now < target.effectUntil
            ? target.effectMotionScale
            : 1;
        target.x += target.vx * seconds * motionScale;
        target.y += target.vy * seconds * motionScale;
        var left = target.radius + 18;
        var right = this.width - target.radius - 18;
        var top = Math.max(82, this.height * 0.17);
        var bottom =
          state.round.resolved || (target.effectUntil && now < target.effectUntil)
            ? this.height - target.radius - 18
            : this.height * 0.7;
        if (target.x < left || target.x > right) {
          target.x = clamp(target.x, left, right);
          target.vx *= -1;
        }
        if (target.y < top || target.y > bottom) {
          target.y = clamp(target.y, top, bottom);
          target.vy *= -1;
        }
      }.bind(this),
    );
    this.renderAbility(now);
  };

  ArenaController.prototype.drawAbilityGuide = function (now) {
    var state = this.drillState;
    var ability = state.round.ability;
    var context = this.context;
    var tank = this.abilityTankPoint();
    var unitScale = this.arenaUnitScale();
    var range = ability.range * unitScale;
    var point = this.pointer.active ? this.pointer : { x: tank.x, y: tank.y - range };
    var aimEnd = cappedPoint(tank, point, range);
    if (ability.defensive) {
      var attacker = state.targets.find(function (target) {
        return target.correct;
      });
      var cueProgress = clamp(
        (now - state.round.cueAt) /
          Math.max(1, state.round.impactAt - state.round.cueAt),
        0,
        1,
      );
      var shieldWindow =
        now >= state.round.windowStart && now <= state.round.windowEnd;
      context.save();
      context.strokeStyle = shieldWindow
        ? "rgba(197, 173, 118, 0.95)"
        : "rgba(115, 168, 191, 0.4)";
      context.fillStyle = shieldWindow
        ? "rgba(197, 173, 118, 0.12)"
        : "rgba(115, 168, 191, 0.06)";
      context.lineWidth = shieldWindow ? 5 : 2;
      context.beginPath();
      context.arc(tank.x, tank.y, state.round.hero.radius * unitScale + 18, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      if (attacker && now >= state.round.cueAt && !state.round.resolved) {
        var projectile = {
          x: lerp(attacker.x, tank.x, cueProgress),
          y: lerp(attacker.y, tank.y, cueProgress),
        };
        context.strokeStyle = "rgba(184, 93, 97, 0.58)";
        context.lineWidth = 2;
        context.setLineDash([6, 6]);
        context.beginPath();
        context.moveTo(attacker.x, attacker.y);
        context.lineTo(tank.x, tank.y);
        context.stroke();
        context.setLineDash([]);
        context.fillStyle = shieldWindow ? "#c5ad76" : "#b85d61";
        context.shadowColor = context.fillStyle;
        context.shadowBlur = 14;
        context.beginPath();
        context.arc(projectile.x, projectile.y, 8, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
      return;
    }
    var invalid = ability.shape === "area" && distance(tank, point) > range + 3;
    context.save();
    context.strokeStyle = invalid ? "rgba(184, 93, 97, 0.74)" : "rgba(197, 173, 118, 0.44)";
    context.fillStyle = invalid ? "rgba(184, 93, 97, 0.09)" : "rgba(197, 173, 118, 0.08)";
    context.lineWidth = 2;
    context.setLineDash([8, 7]);
    context.beginPath();
    context.arc(tank.x, tank.y, range, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);

    if (ability.shape === "line") {
      context.lineWidth = Math.max(3, ability.width * unitScale);
      context.globalAlpha = 0.45;
      context.beginPath();
      context.moveTo(tank.x, tank.y);
      context.lineTo(aimEnd.x, aimEnd.y);
      context.stroke();
    } else if (ability.shape === "area") {
      context.beginPath();
      context.arc(point.x, point.y, (ability.radius || 1.5) * unitScale, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    } else if (ability.shape === "cone") {
      var angle = Math.atan2(point.y - tank.y, point.x - tank.x);
      var halfAngle = ((ability.angle || 45) * Math.PI) / 360;
      context.beginPath();
      context.moveTo(tank.x, tank.y);
      context.arc(tank.x, tank.y, range, angle - halfAngle, angle + halfAngle);
      context.closePath();
      context.fill();
      context.stroke();
    } else if (ability.shape === "self") {
      context.beginPath();
      context.arc(tank.x, tank.y, range, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    } else {
      context.beginPath();
      context.moveTo(tank.x, tank.y);
      context.lineTo(point.x, point.y);
      context.stroke();
    }
    context.restore();
  };

  ArenaController.prototype.renderAbility = function (now) {
    var state = this.drillState;
    var context = this.context;
    var hero = state.round.hero;
    var unitScale = this.arenaUnitScale();
    var tank = this.abilityTankPoint();
    var tankRadius = hero.radius * unitScale;
    this.renderArenaGrid();

    (state.obstacles || []).forEach(function (obstacle) {
      context.save();
      context.fillStyle = "rgba(25, 35, 44, 0.94)";
      context.strokeStyle = "rgba(197, 173, 118, 0.34)";
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 10);
      context.fill();
      context.stroke();
      context.fillStyle = "rgba(238, 242, 241, 0.52)";
      context.font = "800 8px Segoe UI, sans-serif";
      context.textAlign = "center";
      context.fillText("BLOCK", obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2 + 3);
      context.restore();
    });
    var moveRoute = [{ x: tank.x, y: tank.y }].concat(state.movePath || []);
    if (moveRoute.length > 1) {
      context.save();
      context.strokeStyle = "rgba(115, 168, 191, 0.68)";
      context.lineWidth = 3;
      context.setLineDash([5, 7]);
      context.beginPath();
      context.moveTo(moveRoute[0].x, moveRoute[0].y);
      moveRoute.slice(1).forEach(function (point) { context.lineTo(point.x, point.y); });
      context.stroke();
      context.restore();
    }
    if (now < state.commandMarkerUntil) {
      context.save();
      context.strokeStyle = "rgba(115, 168, 191, 0.9)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(state.moveTarget.x, state.moveTarget.y, 13, 0, Math.PI * 2);
      context.moveTo(state.moveTarget.x - 18, state.moveTarget.y);
      context.lineTo(state.moveTarget.x + 18, state.moveTarget.y);
      context.moveTo(state.moveTarget.x, state.moveTarget.y - 18);
      context.lineTo(state.moveTarget.x, state.moveTarget.y + 18);
      context.stroke();
      context.restore();
    }

    if (now < state.round.activeAt) {
      this.drawPortrait(avatar(hero.id), tank.x, tank.y, tankRadius, {
        ring: "#73a8bf",
        shadow: true,
        initials: hero.name.slice(0, 2),
      });
      this.drawNameplate("ВЫ · " + hero.name.toUpperCase(), tank.x, tank.y + tankRadius + 17, false);
      context.save();
      var cardWidth = Math.min(this.width - 48, 580);
      var cardX = (this.width - cardWidth) / 2;
      var cardY = Math.max(88, this.height * 0.2);
      context.fillStyle = "rgba(15, 22, 29, 0.94)";
      context.strokeStyle = "rgba(197, 173, 118, 0.62)";
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(cardX, cardY, cardWidth, 112, 14);
      context.fill();
      context.stroke();
      context.textAlign = "center";
      context.fillStyle = "rgba(197, 173, 118, 0.98)";
      context.font = "900 11px Segoe UI, sans-serif";
      context.fillText(hero.name.toUpperCase() + " · " + state.round.ability.key.toUpperCase(), this.width / 2, cardY + 25);
      context.fillStyle = "rgba(238, 242, 241, 0.98)";
      context.font = "900 20px Segoe UI, sans-serif";
      context.fillText(state.round.ability.name.toUpperCase(), this.width / 2, cardY + 53);
      context.fillStyle = "rgba(205, 219, 225, 0.78)";
      context.font = "700 11px Segoe UI, sans-serif";
      context.fillText(
        abilityShapeLabel(state.round.ability) + " · " + abilityGeometryLabel(state.round.ability),
        this.width / 2,
        cardY + 78,
      );
      context.fillStyle = "rgba(115, 168, 191, 0.96)";
      context.fillText("После отсчёта появятся союзники и враги", this.width / 2, cardY + 98);
      context.restore();
      return;
    }

    state.noise.forEach(function (particle) {
      context.fillStyle = "rgba(205, 219, 225, " + particle.alpha + ")";
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();
    });
    if (state.wall) {
      context.save();
      context.fillStyle = "rgba(26, 35, 44, 0.94)";
      context.strokeStyle = "rgba(197, 173, 118, 0.52)";
      context.lineWidth = 2;
      context.fillRect(state.wall.x, state.wall.y, state.wall.width, state.wall.height);
      context.strokeRect(state.wall.x, state.wall.y, state.wall.width, state.wall.height);
      context.fillStyle = "rgba(197, 173, 118, 0.78)";
      context.font = "900 9px Segoe UI, sans-serif";
      context.textAlign = "center";
      context.fillText("СТЕНА", state.wall.x + state.wall.width / 2, state.wall.y - 8);
      context.restore();
    }
    this.drawAbilityGuide(now);

    if (state.trail && now < state.trail.expires) {
      var life = clamp((state.trail.expires - now) / 420, 0, 1);
      context.save();
      context.strokeStyle = state.trail.positive
        ? "rgba(197, 173, 118, " + life + ")"
        : "rgba(184, 93, 97, " + life + ")";
      context.lineWidth = 6;
      context.beginPath();
      context.moveTo(state.trail.from.x, state.trail.from.y);
      context.lineTo(state.trail.to.x, state.trail.to.y);
      context.stroke();
      context.restore();
    }
    if (state.effectPulse && now < state.effectPulse.expires) {
      var pulseLife = clamp(
        (state.effectPulse.expires - now) /
          Math.max(1, state.effectPulse.expires - state.effectPulse.startedAt),
        0,
        1,
      );
      context.save();
      context.strokeStyle = "rgba(197, 173, 118, " + pulseLife + ")";
      context.lineWidth = 3;
      context.beginPath();
      context.arc(
        state.effectPulse.x,
        state.effectPulse.y,
        18 + (1 - pulseLife) * 42,
        0,
        Math.PI * 2,
      );
      context.stroke();
      context.restore();
    }

    state.targets.forEach(
      function (target) {
        var ring = target.correct
          ? state.round.ability.supportive
            ? "#73a8bf"
            : "#c5ad76"
          : target.ally
            ? "#73a8bf"
            : "#b85d61";
        context.save();
        context.strokeStyle = "rgba(238, 242, 241, 0.28)";
        context.setLineDash([3, 4]);
        context.beginPath();
        context.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
        context.stroke();
        context.restore();
        this.drawPortrait(avatar(target.hero), target.x, target.y, target.radius, {
          ring: ring,
          health: 0.72,
          shadow: true,
          initials: (HERO_NAMES[target.hero] || "EN").slice(0, 2),
        });
        this.drawNameplate(
          target.correct
            ? state.round.ability.defensive
              ? "ВРАГ · ИСТОЧНИК · " + HERO_NAMES[target.hero]
              : state.round.ability.supportive
                ? "СОЮЗНИК · ЗАЩИТИ · " + HERO_NAMES[target.hero]
                : "ВРАГ · ПРИОРИТЕТ · " + HERO_NAMES[target.hero]
            : target.ally
              ? "СОЮЗНИК · " + HERO_NAMES[target.hero]
              : "ВРАГ · " + HERO_NAMES[target.hero],
          target.x,
          target.y + target.radius + 13,
          !target.ally,
        );
        if (target.effectUntil && now < target.effectUntil && target.effectLabel) {
          context.save();
          context.fillStyle = "rgba(197, 173, 118, 0.98)";
          context.font = "900 10px Segoe UI, sans-serif";
          context.textAlign = "center";
          context.fillText(
            target.effectLabel,
            target.x,
            target.y - target.radius - 15,
          );
          context.restore();
        }
        if (target.forbidden) {
          context.save();
          context.fillStyle = "rgba(197, 173, 118, 0.95)";
          context.font = "900 13px Segoe UI, sans-serif";
          context.textAlign = "center";
          context.fillText("НЕТ ОКНА", target.x, target.y - target.radius - 13);
          context.restore();
        }
      }.bind(this),
    );

    var casterPoint =
      state.casterVisual && now < state.casterVisual.until
        ? state.casterVisual
        : tank;
    this.drawPortrait(avatar(hero.id), casterPoint.x, casterPoint.y, tankRadius, {
      ring: "#73a8bf",
      shadow: true,
      initials: hero.name.slice(0, 2),
    });
    this.drawNameplate(
      "ВЫ · " + hero.name.toUpperCase(),
      casterPoint.x,
      casterPoint.y + tankRadius + 17,
      false,
    );
    if (state.casterEffect && now < state.casterEffect.until) {
      context.save();
      context.fillStyle = "rgba(115, 168, 191, 0.98)";
      context.font = "900 11px Segoe UI, sans-serif";
      context.textAlign = "center";
      context.fillText(
        state.casterEffect.label,
        casterPoint.x,
        casterPoint.y - tankRadius - 17,
      );
      context.restore();
    }
  };

  var SWITCH_SCENARIOS = [
    {
      signal: "GENJI → BACKLINE",
      context: "Андуин без защитной кнопки. Дайвер отрезан от своей команды.",
      facts: ["BACKLINE · 34% HP · БЕЗ ESCAPE", "DIVER · В РАДИУСЕ", "MAIN · 42% HP · ЕСТЬ ВЫХОД"],
      action: "peel",
      target: "diver",
      result: "Вернись к healer и вытесни Гэндзи из backline.",
    },
    {
      signal: "GENJI → STUN RANGE",
      context: "Гэндзи потратил Swift Strike и вошёл в радиус контроля.",
      facts: ["BACKLINE · ПОД УГРОЗОЙ", "DIVER · БЕЗ ESCAPE · БЕЗ CLEANSE", "MAIN · 61% HP"],
      action: "stun",
      target: "diver",
      result: "Зафиксируй дайвера: команда успевает дать ответный урон.",
    },
    {
      signal: "VALLA → 12% HP",
      context: "Healer в безопасности, а основная цель уже без выхода.",
      facts: ["BACKLINE · В БЕЗОПАСНОСТИ", "DIVER · ДАЛЕКО", "MAIN · 12% HP · БЕЗ ESCAPE"],
      action: "ignore",
      target: "main",
      result: "Не бросай почти завершённый engage ради безопасного дайвера.",
    },
    {
      signal: "GENJI → CLEANSE READY",
      context: "У противника готово снятие контроля, но твой healer под угрозой.",
      facts: ["BACKLINE · 39% HP · БЕЗ ESCAPE", "DIVER · CLEANSE READY", "MAIN · 54% HP"],
      action: "peel",
      target: "diver",
      result: "Не трать stun в Cleanse: перекрой траекторию и peel позиционно.",
    },
    {
      signal: "DIABLO → WALL ANGLE",
      context: "Основная цель открыла угол у стены, а Гэндзи ещё далеко от healer.",
      facts: ["BACKLINE · В БЕЗОПАСНОСТИ", "DIVER · ВНЕ РАДИУСА", "MAIN · WALL ANGLE · KILL WINDOW"],
      action: "ignore",
      target: "main",
      result: "Сохрани давление: сейчас сильнее добрать wall stun.",
    },
  ];

  ArenaController.prototype.initSwitch = function (now) {
    this.stats = {
      rounds: 0,
      correct: 0,
      wrong: 0,
      reactionTotal: 0,
      pathExcess: 0,
      pressureMs: 0,
      pressureTotal: 0,
      accurateClicks: 0,
      targetReactionTotal: 0,
      decisionReactionTotal: 0,
    };
    this.drillState = {
      mode: "pressure",
      scenario: null,
      main: { x: this.width * 0.68, y: this.height * 0.47, radius: 39 },
      healer: { x: this.width * 0.27, y: this.height * 0.66, radius: 34 },
      diver: { x: this.width * 0.9, y: this.height * 0.25, radius: 35 },
      signalAt: 0,
      deadline: 0,
      nextRoundAt: now,
      clickedTarget: "",
      clickAccuracy: 0,
      pathLength: 0,
      directDistance: 0,
      pressureStart: now,
      roundPressureMs: 0,
      roundPressureTotal: 0,
      targetClickedAt: 0,
      resolved: false,
      roundIndex: 0,
      tutorial: true,
    };
    this.spawnSwitchRound(now);
  };

  ArenaController.prototype.spawnSwitchRound = function (now) {
    var state = this.drillState;
    var margin = Math.max(42, Math.min(this.width, this.height) * 0.08);
    var tutorial = state.roundIndex === 0;
    state.mode = "pressure";
    state.scenario = tutorial ? SWITCH_SCENARIOS[0] : choose(SWITCH_SCENARIOS);
    state.tutorial = tutorial;
    state.roundIndex += 1;
    state.main = {
      x: randomBetween(this.width * 0.56, this.width - margin - 46),
      y: randomBetween(this.height * 0.32, this.height * 0.61),
      radius: 39,
    };
    state.healer = {
      x: randomBetween(margin + 36, this.width * 0.36),
      y: randomBetween(this.height * 0.5, this.height * 0.7),
      radius: 34,
    };
    state.diver = {
      x: randomBetween(this.width * 0.72, this.width - margin),
      y: randomBetween(this.height * 0.18, this.height * 0.34),
      radius: 35,
    };
    state.signalAt = tutorial
      ? now + 5000
      : now + Math.max(1300, randomBetween(1900, 2800) - (this.difficulty - 1) * 110);
    state.deadline = Infinity;
    state.nextRoundAt = Infinity;
    state.clickedTarget = "";
    state.clickAccuracy = 0;
    state.pathLength = 0;
    state.directDistance = 0;
    state.pressureStart = now;
    state.roundPressureMs = 0;
    state.roundPressureTotal = 0;
    state.targetClickedAt = 0;
    state.resolved = false;
    this.actions.classList.remove("is-visible");
    this.overlay.querySelectorAll("[data-switch-action]").forEach(function (button) {
      button.disabled = true;
    });
    this.switchStep.textContent = tutorial
      ? "ОБУЧЕНИЕ · ПРОЧИТАЙ РОЛИ И ТРИ ДЕЙСТВИЯ"
      : "СИГНАЛ ЕЩЁ НЕ ПОЯВИЛСЯ";
    this.callout.innerHTML = tutorial
      ? "ШАГ 0 · <b>КУРСОР НА ВАЛЛЕ</b>"
      : "ДАВЛЕНИЕ → <b>ОСНОВНАЯ ЦЕЛЬ</b>";
    this.contextText.innerHTML = tutorial
      ? '<strong class="arena-context__title">СИНЯЯ РАМКА — СОЮЗНИК. КРАСНАЯ — ВРАГ.</strong><span>Сейчас держи курсор на ВАЛЛЕ.</span><span>После сигнала: клик по нужной цели → STUN, PEEL или IGNORE.</span>'
      : "Держи курсор на основной цели. После сигнала кликни нужную цель и выбери действие.";
  };

  ArenaController.prototype.triggerSwitchSignal = function (now) {
    var state = this.drillState;
    state.mode = "signal";
    state.signalAt = now;
    state.deadline = now + Math.max(3600, 5000 - (this.difficulty - 1) * 180);
    var expected = state.scenario.target === "diver" ? state.diver : state.main;
    state.directDistance = this.pointer.active
      ? distance(this.pointer, expected)
      : distance(state.main, expected);
    state.pathLength = 0;
    this.callout.innerHTML = state.scenario.signal.replace(" → ", " → <b>") + "</b>";
    this.contextText.innerHTML =
      '<strong class="arena-context__title">' +
      state.scenario.context +
      "</strong>" +
      state.scenario.facts
        .map(function (fact) {
          return "<span>" + fact + "</span>";
        })
        .join("");
    this.switchStep.textContent = "ШАГ 1 · КЛИКНИ ВЫБРАННУЮ ЦЕЛЬ";
    this.actions.classList.add("is-visible");
  };

  ArenaController.prototype.handleSwitchTarget = function (point) {
    var state = this.drillState;
    if (!state || state.mode !== "signal" || state.resolved) return;
    var candidates = [
      { id: "main", point: state.main },
      { id: "diver", point: state.diver },
      { id: "healer", point: state.healer },
    ];
    var nearest = null;
    candidates.forEach(function (candidate) {
      var offset = distance(point, candidate.point);
      if (!nearest || offset < nearest.offset) {
        nearest = { id: candidate.id, point: candidate.point, offset: offset };
      }
    });
    if (!nearest || nearest.offset > nearest.point.radius * 1.35) {
      state.clickedTarget = "miss";
      state.clickAccuracy = 0;
      this.showFeedback("КЛИК МИМО ЦЕЛИ", false);
      return;
    }
    state.clickedTarget = nearest.id;
    state.clickAccuracy = clamp(1 - nearest.offset / nearest.point.radius, 0, 1);
    state.targetClickedAt = this.now();
    var targetReaction = state.targetClickedAt - state.signalAt;
    this.stats.targetReactionTotal += targetReaction;
    this.recordReaction(targetReaction, "ЦЕЛЬ ВЫБРАНА");
    this.overlay.querySelectorAll("[data-switch-action]").forEach(function (button) {
      button.disabled = false;
    });
    this.switchStep.textContent = "ШАГ 2 · РЕШЕНИЕ: STUN / PEEL / IGNORE";
    this.showFeedback(
      "ФОКУС · " +
        (nearest.id === "diver"
          ? "ГЭНДЗИ"
          : nearest.id === "main"
            ? "ОСНОВНАЯ ЦЕЛЬ"
            : "АНДУИН"),
      nearest.id === state.scenario.target,
    );
  };

  ArenaController.prototype.chooseSwitchAction = function (action) {
    var state = this.drillState;
    if (!state || state.mode !== "signal" || state.resolved) return;
    if (!state.clickedTarget || state.clickedTarget === "miss") {
      this.showFeedback("СНАЧАЛА ВЫБЕРИ ЦЕЛЬ", false);
      return;
    }
    var now = this.now();
    var reaction = now - state.signalAt;
    var decisionReaction = Math.max(0, now - state.targetClickedAt);
    var targetCorrect = state.clickedTarget === state.scenario.target;
    var actionCorrect = action === state.scenario.action;
    var correct = targetCorrect && actionCorrect;
    var excess = Math.max(0, state.pathLength - state.directDistance);
    this.stats.rounds += 1;
    this.stats.pathExcess += excess;
    this.stats.reactionTotal += reaction;
    this.stats.decisionReactionTotal += decisionReaction;

    if (correct) {
      var reactionBonus = Math.round(clamp(1 - reaction / 1450, 0, 1) * 100);
      var aimBonus = Math.round(state.clickAccuracy * 40);
      var pressureRatio = clamp(
        state.roundPressureTotal
          ? state.roundPressureMs / state.roundPressureTotal
          : 0,
        0,
        1,
      );
      var pressureBonus = Math.round(pressureRatio * 20);
      var pathPenalty = Math.round(Math.min(80, excess * 0.18));
      var award = Math.max(80, 160 + reactionBonus + aimBonus + pressureBonus - pathPenalty);
      this.stats.correct += 1;
      if (state.clickAccuracy >= 0.6) this.stats.accurateClicks += 1;
      this.addScore(award);
      this.showFeedback(
        "ВЕРНЫЙ " + action.toUpperCase() + " · +" + award + " · " + Math.round(reaction) + " мс",
        true,
      );
    } else {
      this.stats.wrong += 1;
      this.addScore(-120);
      this.showFeedback(
        (!targetCorrect ? "НЕВЕРНЫЙ ФОКУС" : "НЕВЕРНОЕ РЕШЕНИЕ") +
          " · −120 · " +
          Math.round(reaction) +
          " мс",
        false,
      );
    }

    state.resolved = true;
    state.mode = "resolved";
    state.nextRoundAt = now + (state.tutorial ? 1500 : 820);
    this.actions.classList.remove("is-visible");
    this.overlay.querySelectorAll("[data-switch-action]").forEach(function (button) {
      button.disabled = true;
    });
    this.recordReaction(reaction, "ЦЕЛЬ + РЕШЕНИЕ");
    this.contextText.textContent = state.scenario.result;
  };

  ArenaController.prototype.updateSwitch = function (now, delta) {
    var state = this.drillState;
    if (!state) return;
    if (state.mode === "pressure") {
      this.stats.pressureTotal += delta;
      state.roundPressureTotal += delta;
      if (this.pointer.active && distance(this.pointer, state.main) <= state.main.radius * 1.45) {
        this.stats.pressureMs += delta;
        state.roundPressureMs += delta;
      }
      if (now >= state.signalAt) this.triggerSwitchSignal(now);
    } else if (state.mode === "signal") {
      var diverDistance = distance(state.diver, state.healer);
      if (diverDistance > state.diver.radius + state.healer.radius + 18) {
        var diverStep = Math.min(diverDistance, (24 + this.difficulty * 4) * (delta / 1000));
        state.diver.x += ((state.healer.x - state.diver.x) / diverDistance) * diverStep;
        state.diver.y += ((state.healer.y - state.diver.y) / diverDistance) * diverStep;
      }
      if (now < state.deadline) {
        this.renderSwitch(now);
        return;
      }
      this.stats.rounds += 1;
      this.stats.wrong += 1;
      this.addScore(-120);
      this.showFeedback("SWITCH ПРОПУЩЕН · −120", false);
      state.resolved = true;
      state.mode = "resolved";
      state.nextRoundAt = now + 420;
      this.actions.classList.remove("is-visible");
      this.overlay.querySelectorAll("[data-switch-action]").forEach(function (button) {
        button.disabled = true;
      });
    } else if (state.mode === "resolved" && now >= state.nextRoundAt) {
      this.spawnSwitchRound(now);
    }
    this.renderSwitch(now);
  };

  ArenaController.prototype.renderSwitch = function (now) {
    var state = this.drillState;
    var context = this.context;
    this.renderArenaGrid();

    context.save();
    context.strokeStyle = "rgba(115, 168, 191, 0.22)";
    context.lineWidth = 2;
    context.setLineDash([9, 8]);
    context.beginPath();
    context.moveTo(state.healer.x, state.healer.y);
    context.lineTo(state.main.x, state.main.y);
    context.stroke();
    context.restore();

    this.drawPortrait(avatar("valla"), state.main.x, state.main.y, state.main.radius, {
      ring: "#b85d61",
      health: 0.28,
      shadow: true,
      initials: "VA",
    });
    this.drawNameplate("ВРАГ · ОСНОВНАЯ ЦЕЛЬ · ВАЛЛА", state.main.x, state.main.y + 53, true);

    this.drawPortrait(avatar("anduin"), state.healer.x, state.healer.y, state.healer.radius, {
      ring: "#73a8bf",
      health: 0.64,
      shadow: true,
      initials: "AN",
    });
    this.drawNameplate("СОЮЗНИК · BACKLINE · АНДУИН", state.healer.x, state.healer.y + 48, false);

    if (state.mode !== "pressure" || state.tutorial) {
      var pulse = 1 + Math.sin(now / 95) * 0.08;
      if (state.mode !== "pressure") {
        context.save();
        context.strokeStyle = "rgba(184, 93, 97, 0.72)";
        context.lineWidth = 3;
        context.beginPath();
        context.arc(state.diver.x, state.diver.y, state.diver.radius * 1.55 * pulse, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      }
      this.drawPortrait(avatar("genji"), state.diver.x, state.diver.y, state.diver.radius, {
        ring: "#b85d61",
        health: 0.82,
        shadow: true,
        initials: "GE",
      });
      this.drawNameplate("ВРАГ · DIVER · ГЭНДЗИ", state.diver.x, state.diver.y + 49, true);
    }

    if (this.pointer.active) {
      context.save();
      context.fillStyle = "rgba(197, 173, 118, 0.9)";
      context.beginPath();
      context.arc(this.pointer.x, this.pointer.y, 5, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  };

  var INTERRUPT_EVENTS = [
    {
      hero: "l90etc",
      label: "E.T.C. · MOSH PIT",
      icon: ABILITIES.mosh,
      kind: "danger",
      duration: 1380,
      hint: "Опасный канал. Прерви Q до завершения.",
    },
    {
      hero: "anduin",
      label: "АНДУИН · SALVATION",
      icon: ABILITIES.salvation,
      kind: "danger",
      duration: 1520,
      hint: "Массовое спасение. Контроль нужен сейчас.",
    },
    {
      hero: "johanna",
      label: "ДЖОАННА · IRON SKIN",
      icon: ABILITIES.ironSkin,
      kind: "unstoppable",
      duration: 1180,
      hint: "Unstoppable. Сохрани контроль.",
    },
    {
      hero: "l90etc",
      label: "E.T.C. · FEINT",
      icon: ABILITIES.mosh,
      kind: "feint",
      duration: 760,
      hint: "Ложное начало анимации. Не нажимай заранее.",
    },
    {
      hero: "anduin",
      label: "АНДУИН · DIVINE STAR",
      icon: ABILITIES.salvation,
      kind: "harmless",
      duration: 920,
      hint: "Неопасная способность. Контроль не нужен.",
    },
    {
      hero: "l90etc",
      label: "E.T.C. · CANCEL",
      icon: ABILITIES.mosh,
      kind: "cancel",
      duration: 680,
      hint: "Каст отменён самим противником. Не реагируй на шум.",
    },
  ];

  ArenaController.prototype.initInterrupt = function (now) {
    this.stats = {
      decisions: 0,
      correct: 0,
      interrupts: 0,
      correctWait: 0,
      reactionTotal: 0,
      bestReaction: Infinity,
      falsePress: 0,
      unstoppablePress: 0,
      misses: 0,
    };
    this.drillState = {
      event: null,
      mode: "waiting",
      nextEventAt: now + randomBetween(650, 1150),
      eventStart: 0,
      eventEnd: 0,
      resolved: false,
    };
    this.callout.textContent = "СМОТРИ НА АНИМАЦИЮ";
    this.contextText.textContent = "Q или пробел — контроль. Не нажимай на feint и Unstoppable.";
    this.cast.classList.remove("is-visible");
  };

  ArenaController.prototype.startInterruptEvent = function (now) {
    var state = this.drillState;
    var event = choose(INTERRUPT_EVENTS);
    state.event = event;
    state.mode = "casting";
    state.eventStart = now;
    state.eventEnd = now + Math.max(520, event.duration - (this.difficulty - 1) * 70);
    state.resolved = false;
    this.callout.innerHTML = event.label.replace(" · ", " · <b>") + "</b>";
    this.contextText.textContent = event.hint;
    this.castLabel.textContent = event.label;
    this.castTrack.style.transform = "scaleX(0)";
    this.cast.classList.add("is-visible");
    var firstAbility = this.hudButtons[0].querySelector("img");
    firstAbility.src = ABILITIES.muradin;
    firstAbility.alt = "Прервать Q";
  };

  ArenaController.prototype.resolveInterruptEvent = function (now, pressed) {
    var state = this.drillState;
    if (!state || state.mode !== "casting" || state.resolved) return;
    var event = state.event;
    state.resolved = true;
    state.mode = "gap";
    state.nextEventAt = now + randomBetween(460, 820);
    this.cast.classList.remove("is-visible");
    this.stats.decisions += 1;
    var pressReaction = pressed ? now - state.eventStart : 0;
    var pressReactionLabel = pressed
      ? this.recordReaction(pressReaction, "INTERRUPT WINDOW")
      : "";

    if (pressed && event.kind === "danger") {
      var reaction = pressReaction;
      var bonus = Math.round(clamp(1 - reaction / 650, 0, 1) * 100);
      var award = 200 + bonus;
      this.stats.correct += 1;
      this.stats.interrupts += 1;
      this.stats.reactionTotal += reaction;
      this.stats.bestReaction = Math.min(this.stats.bestReaction, reaction);
      this.addScore(award);
      this.showFeedback("INTERRUPT · +" + award + " · " + pressReactionLabel, true);
      this.contextText.textContent = "Каст остановлен. Контроль попал в рабочее окно.";
      return;
    }

    if (!pressed && event.kind === "danger") {
      this.stats.misses += 1;
      this.addScore(-150);
      this.showFeedback("КАСТ ПРОПУЩЕН · −150", false);
      this.contextText.textContent = "Опасная способность завершилась без ответа.";
      return;
    }

    if (pressed) {
      this.stats.falsePress += 1;
      if (event.kind === "unstoppable") {
        this.stats.unstoppablePress += 1;
        this.addScore(-100);
        this.showFeedback("UNSTOPPABLE · −100 · " + pressReactionLabel, false);
        this.contextText.textContent = "Контроль потрачен в невосприимчивость.";
      } else {
        this.addScore(-75);
        this.showFeedback("ЛОЖНАЯ РЕАКЦИЯ · −75 · " + pressReactionLabel, false);
        this.contextText.textContent = "Это не было рабочим interrupt window.";
      }
      return;
    }

    this.stats.correct += 1;
    this.stats.correctWait += 1;
    this.addScore(60);
    this.showFeedback("КОНТРОЛЬ СОХРАНЁН · +60", true);
    this.contextText.textContent = "Верное решение: не отдавать кнопку в пустое окно.";
  };

  ArenaController.prototype.handleInterrupt = function () {
    var state = this.drillState;
    if (!state || state.mode !== "casting" || state.resolved) return;
    this.resolveInterruptEvent(this.now(), true);
  };

  ArenaController.prototype.updateInterrupt = function (now) {
    var state = this.drillState;
    if (!state) return;
    if ((state.mode === "waiting" || state.mode === "gap") && now >= state.nextEventAt) {
      this.startInterruptEvent(now);
    }
    if (state.mode === "casting") {
      var progress = clamp((now - state.eventStart) / (state.eventEnd - state.eventStart), 0, 1);
      this.castTrack.style.transform = "scaleX(" + progress + ")";
      if (now >= state.eventEnd) this.resolveInterruptEvent(now, false);
    }
    this.renderInterrupt(now);
  };

  ArenaController.prototype.renderInterrupt = function (now) {
    var state = this.drillState;
    var context = this.context;
    this.renderArenaGrid();
    var x = this.width * 0.5;
    var y = this.height * 0.46;
    var event = state.event;
    var hero = event ? event.hero : "l90etc";
    var active = state.mode === "casting";

    if (active) {
      var ratio = clamp((now - state.eventStart) / (state.eventEnd - state.eventStart), 0, 1);
      context.save();
      context.strokeStyle =
        event.kind === "danger" ? "rgba(184, 93, 97, 0.82)" : "rgba(197, 173, 118, 0.58)";
      context.lineWidth = 6;
      context.beginPath();
      context.arc(x, y, 77, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      context.stroke();
      context.restore();
    }

    this.drawPortrait(avatar(hero), x, y, 58, {
      ring: active && event.kind === "danger" ? "#b85d61" : "#c5ad76",
      health: 0.83,
      shadow: true,
      initials: (HERO_NAMES[hero] || "EN").slice(0, 2),
    });
    this.drawNameplate(
      active ? event.label : "ОЖИДАЙ КАСТ",
      x,
      y + 78,
      true,
    );

    if (active && event.kind === "unstoppable") {
      var icon = this.image(statusIcon("unstoppable"));
      context.save();
      context.fillStyle = "rgba(16, 23, 31, 0.92)";
      context.beginPath();
      context.arc(x + 54, y - 49, 24, 0, Math.PI * 2);
      context.fill();
      if (icon) context.drawImage(icon, x + 36, y - 67, 36, 36);
      context.restore();
    }

    context.save();
    context.fillStyle = "rgba(238, 242, 241, 0.75)";
    context.font = "800 11px Segoe UI, sans-serif";
    context.textAlign = "center";
    context.fillText("Q / ПРОБЕЛ · INTERRUPT", x, Math.min(this.height - 28, y + 126));
    context.restore();
  };

  function resolveCircleRect(entity, rectangle) {
    var nearestX = clamp(entity.x, rectangle.x, rectangle.x + rectangle.width);
    var nearestY = clamp(entity.y, rectangle.y, rectangle.y + rectangle.height);
    var dx = entity.x - nearestX;
    var dy = entity.y - nearestY;
    var length = Math.sqrt(dx * dx + dy * dy);
    if (length >= entity.radius) return false;
    if (length > 0.001) {
      var push = entity.radius - length + 0.5;
      entity.x += (dx / length) * push;
      entity.y += (dy / length) * push;
      return true;
    }
    var left = Math.abs(entity.x - rectangle.x);
    var right = Math.abs(rectangle.x + rectangle.width - entity.x);
    var top = Math.abs(entity.y - rectangle.y);
    var bottom = Math.abs(rectangle.y + rectangle.height - entity.y);
    var minimum = Math.min(left, right, top, bottom);
    if (minimum === left) entity.x = rectangle.x - entity.radius;
    else if (minimum === right) entity.x = rectangle.x + rectangle.width + entity.radius;
    else if (minimum === top) entity.y = rectangle.y - entity.radius;
    else entity.y = rectangle.y + rectangle.height + entity.radius;
    return true;
  }

  ArenaController.prototype.bodyblockLayout = function () {
    return {
      exit: { x: this.width * 0.79, y: this.height * 0.18, radius: 43 },
      team: { x: this.width * 0.18, y: this.height * 0.78, radius: 96 },
      obstacles: [
        {
          x: this.width * 0.38,
          y: this.height * 0.24,
          width: Math.max(54, this.width * 0.1),
          height: Math.max(78, this.height * 0.2),
        },
        {
          x: this.width * 0.57,
          y: this.height * 0.59,
          width: Math.max(66, this.width * 0.12),
          height: Math.max(52, this.height * 0.13),
        },
      ],
      towers: [
        { x: this.width * 0.83, y: this.height * 0.55, radius: 82 },
        { x: this.width * 0.63, y: this.height * 0.12, radius: 70 },
      ],
    };
  };

  ArenaController.prototype.resetBodyblockRound = function (now, escaped) {
    var state = this.drillState;
    var layout = this.bodyblockLayout();
    state.layout = layout;
    state.enemy.x = this.width * randomBetween(0.3, 0.39);
    state.enemy.y = this.height * randomBetween(0.54, 0.67);
    state.tank.x = lerp(state.enemy.x, layout.exit.x, 0.27);
    state.tank.y = lerp(state.enemy.y, layout.exit.y, 0.27);
    state.target.x = state.tank.x;
    state.target.y = state.tank.y;
    state.holdChain = 0;
    state.roundStart = now;
    state.escapeFlashUntil = escaped ? now + 520 : 0;
  };

  ArenaController.prototype.initBodyblock = function (now) {
    this.stats = {
      blockMs: 0,
      towerMs: 0,
      overextendMs: 0,
      holds: 0,
      escapes: 0,
      obstacleContacts: 0,
    };
    this.drillState = {
      tank: { x: 0, y: 0, radius: 28 },
      enemy: { x: 0, y: 0, radius: 25 },
      target: { x: 0, y: 0 },
      layout: null,
      holdChain: 0,
      quality: false,
      inTower: false,
      overextended: false,
      roundStart: now,
      escapeFlashUntil: 0,
    };
    this.resetBodyblockRound(now, false);
    this.callout.innerHTML = "ЗАКРОЙ ТРАЕКТОРИЮ → <b>ВЫХОД</b>";
    this.contextText.textContent =
      "Веди Мурадина мышью. Держись перед противником, но оставайся в зоне союзного урона.";
  };

  ArenaController.prototype.bodyblockConditions = function () {
    var state = this.drillState;
    var layout = state.layout;
    var enemyToExitX = layout.exit.x - state.enemy.x;
    var enemyToExitY = layout.exit.y - state.enemy.y;
    var routeLength = Math.max(1, Math.sqrt(enemyToExitX * enemyToExitX + enemyToExitY * enemyToExitY));
    var directionX = enemyToExitX / routeLength;
    var directionY = enemyToExitY / routeLength;
    var enemyToTankX = state.tank.x - state.enemy.x;
    var enemyToTankY = state.tank.y - state.enemy.y;
    var forward = enemyToTankX * directionX + enemyToTankY * directionY;
    var lateral = Math.abs(enemyToTankX * directionY - enemyToTankY * directionX);
    var teamLimit = Math.min(540, Math.max(260, this.width * 0.62));
    var overextended = distance(state.tank, layout.team) > teamLimit;
    var inTower = layout.towers.some(function (tower) {
      return distance(state.tank, tower) < tower.radius;
    });
    return {
      quality: forward > 7 && forward < 105 && lateral < 48 && !overextended && !inTower,
      inTower: inTower,
      overextended: overextended,
      directionX: directionX,
      directionY: directionY,
      routeLength: routeLength,
    };
  };

  ArenaController.prototype.updateBodyblock = function (now, delta) {
    var state = this.drillState;
    if (!state) return;
    state.layout = this.bodyblockLayout();
    var layout = state.layout;
    var seconds = delta / 1000;

    var tankDx = state.target.x - state.tank.x;
    var tankDy = state.target.y - state.tank.y;
    var tankDistance = Math.sqrt(tankDx * tankDx + tankDy * tankDy);
    var tankStep = Math.min(tankDistance, (235 + this.difficulty * 12) * seconds);
    if (tankDistance > 0.1) {
      state.tank.x += (tankDx / tankDistance) * tankStep;
      state.tank.y += (tankDy / tankDistance) * tankStep;
    }

    var conditions = this.bodyblockConditions();
    var enemySpeed = 76 + this.difficulty * 9;
    var enemyVx = conditions.directionX;
    var enemyVy = conditions.directionY;
    var separation = distance(state.enemy, state.tank);
    var collisionRange = state.enemy.radius + state.tank.radius + 7;
    if (separation < collisionRange + 24) {
      var cross =
        (state.tank.x - state.enemy.x) * conditions.directionY -
        (state.tank.y - state.enemy.y) * conditions.directionX;
      var side = cross >= 0 ? -1 : 1;
      var pressure = clamp((collisionRange + 24 - separation) / 32, 0, 1);
      enemyVx = lerp(enemyVx, -conditions.directionY * side, pressure * 0.82);
      enemyVy = lerp(enemyVy, conditions.directionX * side, pressure * 0.82);
    }
    var enemyVectorLength = Math.max(0.001, Math.sqrt(enemyVx * enemyVx + enemyVy * enemyVy));
    state.enemy.x += (enemyVx / enemyVectorLength) * enemySpeed * seconds;
    state.enemy.y += (enemyVy / enemyVectorLength) * enemySpeed * seconds;

    var boundsPadding = 20;
    [state.tank, state.enemy].forEach(
      function (entity) {
        entity.x = clamp(entity.x, boundsPadding + entity.radius, this.width - boundsPadding - entity.radius);
        entity.y = clamp(entity.y, boundsPadding + entity.radius, this.height - boundsPadding - entity.radius);
        layout.obstacles.forEach(function (obstacle) {
          if (resolveCircleRect(entity, obstacle) && entity === state.tank) {
            this.stats.obstacleContacts += 1;
          }
        }, this);
      }.bind(this),
    );

    conditions = this.bodyblockConditions();
    state.quality = conditions.quality;
    state.inTower = conditions.inTower;
    state.overextended = conditions.overextended;

    if (state.quality) {
      state.holdChain += delta;
      this.stats.blockMs += delta;
      this.setScore(this.score + delta * 0.075);
      if (state.holdChain >= 6000) {
        state.holdChain = 0;
        this.stats.holds += 1;
        this.addScore(350);
        this.showFeedback("ВЫХОД УДЕРЖАН · +350", true);
      }
    } else {
      state.holdChain = Math.max(0, state.holdChain - delta * 1.6);
    }

    if (state.inTower) {
      this.stats.towerMs += delta;
      this.setScore(this.score - delta * 0.055);
    }
    if (state.overextended) {
      this.stats.overextendMs += delta;
      this.setScore(this.score - delta * 0.035);
    }

    if (distance(state.enemy, layout.exit) <= layout.exit.radius) {
      this.stats.escapes += 1;
      this.addScore(-180);
      this.showFeedback("ПРОТИВНИК ПРОШЁЛ · −180", false);
      this.resetBodyblockRound(now, true);
    }

    if (state.inTower) this.contextText.textContent = "Опасно: ты в радиусе башни. Отступи на линию bodyblock.";
    else if (state.overextended) this.contextText.textContent = "Команда слишком далеко. Сократи дистанцию до зоны союзного урона.";
    else if (state.quality) this.contextText.textContent = "Качественный bodyblock: выход закрыт, команда остаётся в дистанции.";
    else this.contextText.textContent = "Займи пространство между противником и безопасным выходом.";

    this.renderBodyblock(now);
  };

  ArenaController.prototype.renderBodyblock = function (now) {
    var state = this.drillState;
    var layout = state.layout;
    var context = this.context;
    this.renderArenaGrid();

    context.save();
    var teamGradient = context.createRadialGradient(
      layout.team.x,
      layout.team.y,
      12,
      layout.team.x,
      layout.team.y,
      layout.team.radius * 1.55,
    );
    teamGradient.addColorStop(0, "rgba(115, 168, 191, 0.25)");
    teamGradient.addColorStop(1, "rgba(115, 168, 191, 0)");
    context.fillStyle = teamGradient;
    context.beginPath();
    context.arc(layout.team.x, layout.team.y, layout.team.radius * 1.55, 0, Math.PI * 2);
    context.fill();
    context.restore();

    layout.towers.forEach(function (tower) {
      context.save();
      context.fillStyle = "rgba(184, 93, 97, 0.08)";
      context.strokeStyle = "rgba(184, 93, 97, 0.38)";
      context.setLineDash([7, 7]);
      context.beginPath();
      context.arc(tower.x, tower.y, tower.radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = "rgba(184, 93, 97, 0.9)";
      context.font = "900 10px Segoe UI, sans-serif";
      context.textAlign = "center";
      context.fillText("БАШНЯ", tower.x, tower.y);
      context.restore();
    });

    layout.obstacles.forEach(function (obstacle) {
      context.save();
      context.fillStyle = "rgba(25, 35, 44, 0.9)";
      context.strokeStyle = "rgba(197, 173, 118, 0.24)";
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 12);
      context.fill();
      context.stroke();
      context.restore();
    });

    context.save();
    context.strokeStyle = state.quality
      ? "rgba(197, 173, 118, 0.78)"
      : "rgba(238, 242, 241, 0.26)";
    context.lineWidth = state.quality ? 5 : 2;
    context.setLineDash(state.quality ? [] : [10, 8]);
    context.beginPath();
    context.moveTo(state.enemy.x, state.enemy.y);
    context.lineTo(layout.exit.x, layout.exit.y);
    context.stroke();
    context.restore();

    var exitPulse = 1 + Math.sin(now / 180) * 0.08;
    context.save();
    context.strokeStyle = "rgba(135, 190, 139, 0.9)";
    context.lineWidth = 4;
    context.beginPath();
    context.arc(layout.exit.x, layout.exit.y, layout.exit.radius * exitPulse, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "rgba(135, 190, 139, 0.9)";
    context.font = "900 10px Segoe UI, sans-serif";
    context.textAlign = "center";
    context.fillText("ВЫХОД", layout.exit.x, layout.exit.y + 4);
    context.restore();

    this.drawPortrait(avatar("valla"), state.enemy.x, state.enemy.y, state.enemy.radius, {
      ring: "#b85d61",
      health: 0.44,
      shadow: true,
      initials: "VA",
    });
    this.drawNameplate("ПРОТИВНИК", state.enemy.x, state.enemy.y + 39, true);
    this.drawPortrait(avatar("muradin"), state.tank.x, state.tank.y, state.tank.radius, {
      ring: state.quality ? "#c5ad76" : "#73a8bf",
      health: 0.91,
      shadow: true,
      initials: "MT",
    });
    this.drawNameplate(
      state.quality ? "BODYBLOCK" : "ВЫ · МУРАДИН",
      state.tank.x,
      state.tank.y + 42,
      false,
    );

    context.save();
    context.fillStyle = "rgba(115, 168, 191, 0.88)";
    context.font = "900 10px Segoe UI, sans-serif";
    context.textAlign = "center";
    context.fillText("ЗОНА СОЮЗНОГО УРОНА", layout.team.x, layout.team.y + 4);
    context.restore();
  };

  function expandRectangle(rectangle, padding) {
    return {
      x: rectangle.x - padding,
      y: rectangle.y - padding,
      width: rectangle.width + padding * 2,
      height: rectangle.height + padding * 2,
    };
  }

  function pointInsideRectangle(point, rectangle) {
    return (
      point.x >= rectangle.x &&
      point.x <= rectangle.x + rectangle.width &&
      point.y >= rectangle.y &&
      point.y <= rectangle.y + rectangle.height
    );
  }

  function segmentIntersectsRectangle(start, end, rectangle) {
    var dx = end.x - start.x;
    var dy = end.y - start.y;
    var p = [-dx, dx, -dy, dy];
    var q = [
      start.x - rectangle.x,
      rectangle.x + rectangle.width - start.x,
      start.y - rectangle.y,
      rectangle.y + rectangle.height - start.y,
    ];
    var minimum = 0;
    var maximum = 1;
    for (var index = 0; index < 4; index += 1) {
      if (Math.abs(p[index]) < 0.0001) {
        if (q[index] < 0) return false;
      } else {
        var ratio = q[index] / p[index];
        if (p[index] < 0) minimum = Math.max(minimum, ratio);
        else maximum = Math.min(maximum, ratio);
        if (minimum > maximum) return false;
      }
    }
    return true;
  }

  function projectPointToWalkable(point, rectangles, margin, width, height) {
    var projected = {
      x: clamp(point.x, margin, width - margin),
      y: clamp(point.y, margin, height - margin),
    };
    for (var pass = 0; pass < 5; pass += 1) {
      var containing = rectangles.find(function (rectangle) {
        return pointInsideRectangle(projected, rectangle);
      });
      if (!containing) break;
      var choices = [
        { x: containing.x - 3, y: projected.y, cost: projected.x - containing.x },
        {
          x: containing.x + containing.width + 3,
          y: projected.y,
          cost: containing.x + containing.width - projected.x,
        },
        { x: projected.x, y: containing.y - 3, cost: projected.y - containing.y },
        {
          x: projected.x,
          y: containing.y + containing.height + 3,
          cost: containing.y + containing.height - projected.y,
        },
      ];
      choices.sort(function (left, right) {
        return Math.abs(left.cost) - Math.abs(right.cost);
      });
      projected.x = clamp(choices[0].x, margin, width - margin);
      projected.y = clamp(choices[0].y, margin, height - margin);
    }
    return projected;
  }

  function segmentIsWalkable(start, end, rectangles) {
    return rectangles.every(function (rectangle) {
      return !segmentIntersectsRectangle(start, end, rectangle);
    });
  }

  function routeLength(points) {
    var total = 0;
    for (var index = 1; index < points.length; index += 1) {
      total += distance(points[index - 1], points[index]);
    }
    return total;
  }

  function buildVisibilityRoute(start, destination, obstacles, radius, width, height) {
    var margin = radius + 18;
    var expanded = obstacles.map(function (obstacle) {
      return expandRectangle(obstacle, radius + 5);
    });
    var goal = projectPointToWalkable(destination, expanded, margin, width, height);
    var nodes = [{ x: start.x, y: start.y }, goal];
    expanded.forEach(function (rectangle) {
      var offset = 3;
      [
        { x: rectangle.x - offset, y: rectangle.y - offset },
        {
          x: rectangle.x + rectangle.width + offset,
          y: rectangle.y - offset,
        },
        {
          x: rectangle.x + rectangle.width + offset,
          y: rectangle.y + rectangle.height + offset,
        },
        {
          x: rectangle.x - offset,
          y: rectangle.y + rectangle.height + offset,
        },
      ].forEach(function (corner) {
        corner.x = clamp(corner.x, margin, width - margin);
        corner.y = clamp(corner.y, margin, height - margin);
        if (
          expanded.every(function (other) {
            return !pointInsideRectangle(corner, other);
          })
        ) {
          nodes.push(corner);
        }
      });
    });

    var costs = nodes.map(function () {
      return Infinity;
    });
    var previous = nodes.map(function () {
      return -1;
    });
    var visited = nodes.map(function () {
      return false;
    });
    costs[0] = 0;
    for (var pass = 0; pass < nodes.length; pass += 1) {
      var current = -1;
      for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
        if (!visited[nodeIndex] && (current < 0 || costs[nodeIndex] < costs[current])) {
          current = nodeIndex;
        }
      }
      if (current < 0 || !Number.isFinite(costs[current])) break;
      if (current === 1) break;
      visited[current] = true;
      for (var neighbor = 0; neighbor < nodes.length; neighbor += 1) {
        if (
          neighbor === current ||
          visited[neighbor] ||
          !segmentIsWalkable(nodes[current], nodes[neighbor], expanded)
        ) {
          continue;
        }
        var candidateCost = costs[current] + distance(nodes[current], nodes[neighbor]);
        if (candidateCost < costs[neighbor]) {
          costs[neighbor] = candidateCost;
          previous[neighbor] = current;
        }
      }
    }

    var path = [];
    if (Number.isFinite(costs[1])) {
      var cursor = 1;
      while (cursor >= 0) {
        path.unshift(nodes[cursor]);
        cursor = previous[cursor];
      }
    } else {
      path = [{ x: start.x, y: start.y }, goal];
    }
    var smoothed = [path[0]];
    var pathIndex = 0;
    while (pathIndex < path.length - 1) {
      var farthest = path.length - 1;
      while (
        farthest > pathIndex + 1 &&
        !segmentIsWalkable(path[pathIndex], path[farthest], expanded)
      ) {
        farthest -= 1;
      }
      smoothed.push(path[farthest]);
      pathIndex = farthest;
    }
    return {
      destination: goal,
      waypoints: smoothed.slice(1),
      length: routeLength(smoothed),
      projected: distance(goal, destination) > 2,
    };
  }

  function moveEntityAlongRoute(entity, waypoints, speed, seconds) {
    var budget = Math.max(0, speed * seconds);
    var travelled = 0;
    while (budget > 0.001 && waypoints.length) {
      var waypoint = waypoints[0];
      var remaining = distance(entity, waypoint);
      if (remaining <= 1) {
        entity.x = waypoint.x;
        entity.y = waypoint.y;
        waypoints.shift();
        continue;
      }
      var step = Math.min(remaining, budget);
      entity.x += ((waypoint.x - entity.x) / remaining) * step;
      entity.y += ((waypoint.y - entity.y) / remaining) * step;
      travelled += step;
      budget -= step;
      if (step >= remaining - 0.001) waypoints.shift();
    }
    return travelled;
  }

  function separateCircles(fixedEntity, movingEntity) {
    var dx = movingEntity.x - fixedEntity.x;
    var dy = movingEntity.y - fixedEntity.y;
    var length = Math.sqrt(dx * dx + dy * dy);
    var minimum = fixedEntity.radius + movingEntity.radius;
    if (length >= minimum) return false;
    if (length < 0.001) {
      dx = 1;
      dy = 0;
      length = 1;
    }
    var push = minimum - length + 0.2;
    movingEntity.x += (dx / length) * push;
    movingEntity.y += (dy / length) * push;
    return true;
  }

  ArenaController.prototype.issueBodyblockCommand = function (point, now, continuous) {
    var state = this.drillState;
    if (!state) return;
    var result = buildVisibilityRoute(
      state.tank,
      point,
      state.layout.obstacles,
      state.tank.radius,
      this.width,
      this.height,
    );
    state.target.x = result.destination.x;
    state.target.y = result.destination.y;
    state.path = result.waypoints;
    state.commandMarkerUntil = now + 850;
    state.commandProjected = result.projected;
    if (!continuous) state.plannedDistance += result.length;
    this.lastBodyCommandAt = now;
    if (!continuous && !state.commandRecorded) {
      var reaction = now - state.intentAt;
      state.commandRecorded = true;
      this.stats.commandReactionTotal += reaction;
      this.stats.commandCount += 1;
      this.stats.bestCommandReaction = Math.min(this.stats.bestCommandReaction, reaction);
      var reactionLabel = this.recordReaction(reaction, "ПКМ · МАРШРУТ");
      this.showFeedback(
        (result.projected ? "ТОЧКА СКОРРЕКТИРОВАНА" : "МАРШРУТ ПРИНЯТ") +
          " · " +
          reactionLabel,
        !result.projected,
      );
    } else if (result.projected && !continuous) {
      this.showFeedback("ТОЧКА НЕДОСТУПНА · МАРШРУТ ПЕРЕСТРОЕН", false);
    }
  };

  ArenaController.prototype.stopBodyblockMovement = function () {
    if (!this.drillState) return;
    this.drillState.path = [];
    this.drillState.target.x = this.drillState.tank.x;
    this.drillState.target.y = this.drillState.tank.y;
    this.bodyCommandHeld = false;
    this.showFeedback("СТОП · S", true);
  };

  ArenaController.prototype.resetBodyblockRound = function (now, escaped) {
    var state = this.drillState;
    var layout = this.bodyblockLayout();
    state.layout = layout;
    state.enemy.x = this.width * randomBetween(0.3, 0.39);
    state.enemy.y = this.height * randomBetween(0.54, 0.67);
    state.tank.x = lerp(state.enemy.x, layout.exit.x, 0.27);
    state.tank.y = lerp(state.enemy.y, layout.exit.y, 0.27);
    state.target.x = state.tank.x;
    state.target.y = state.tank.y;
    state.path = [];
    state.enemyPath = [];
    state.enemyRepathAt = now;
    state.enemyJukeSide = Math.random() < 0.5 ? -1 : 1;
    state.enemyJukeAt = now;
    state.enemyIntent = "ПРОРЫВ";
    state.holdChain = 0;
    state.roundStart = now;
    state.intentAt = now;
    state.commandRecorded = false;
    state.commandMarkerUntil = 0;
    state.escapeFlashUntil = escaped ? now + 520 : 0;
  };

  ArenaController.prototype.initBodyblock = function (now) {
    var hero = TANK_ROSTER[this.selectedHero];
    var unitScale = this.arenaUnitScale();
    this.bodyCommandHeld = false;
    this.stats = {
      blockMs: 0,
      towerMs: 0,
      overextendMs: 0,
      holds: 0,
      escapes: 0,
      obstacleContacts: 0,
      commandReactionTotal: 0,
      commandCount: 0,
      bestCommandReaction: Infinity,
      travelDistance: 0,
    };
    this.drillState = {
      hero: hero,
      tank: { x: 0, y: 0, radius: hero.radius * unitScale },
      enemy: { x: 0, y: 0, radius: (HERO_RADII.valla || 0.625) * unitScale },
      target: { x: 0, y: 0 },
      path: [],
      enemyPath: [],
      enemyRepathAt: now,
      enemyJukeSide: 1,
      enemyJukeAt: now,
      enemyIntent: "ПРОРЫВ",
      layout: null,
      holdChain: 0,
      quality: false,
      inTower: false,
      overextended: false,
      plannedDistance: 0,
      intentAt: now,
      commandRecorded: false,
      commandMarkerUntil: 0,
      roundStart: now,
      escapeFlashUntil: 0,
    };
    this.resetBodyblockRound(now, false);
    this.callout.innerHTML = "ПКМ ПО ЗЕМЛЕ → <b>ЗАКРОЙ ВЫХОД</b>";
    this.contextText.textContent =
      hero.name +
      ": скорость 4,8398 ед./с, collision radius " +
      String(hero.radius).replace(".", ",") +
      ". Курсор без ПКМ героя не двигает.";
    this.parameterElement.textContent = "SPEED 4,8398 · R " + String(hero.radius).replace(".", ",");
  };

  ArenaController.prototype.bodyblockConditions = function () {
    var state = this.drillState;
    var layout = state.layout;
    var routeTarget = state.enemyPath.length ? state.enemyPath[0] : layout.exit;
    var routeLengthValue = Math.max(1, distance(state.enemy, routeTarget));
    var directionX = (routeTarget.x - state.enemy.x) / routeLengthValue;
    var directionY = (routeTarget.y - state.enemy.y) / routeLengthValue;
    var enemyToTankX = state.tank.x - state.enemy.x;
    var enemyToTankY = state.tank.y - state.enemy.y;
    var forward = enemyToTankX * directionX + enemyToTankY * directionY;
    var lateral = Math.abs(enemyToTankX * directionY - enemyToTankY * directionX);
    var unitScale = this.arenaUnitScale();
    var contact = state.enemy.radius + state.tank.radius;
    var teamLimit = Math.min(this.width * 0.62, unitScale * 17);
    var overextended = distance(state.tank, layout.team) > teamLimit;
    var inTower = layout.towers.some(function (tower) {
      return distance(state.tank, tower) < tower.radius + state.tank.radius;
    });
    return {
      quality:
        forward > -state.tank.radius * 0.2 &&
        forward < contact + unitScale * 1.45 &&
        lateral < contact + unitScale * 0.45 &&
        !overextended &&
        !inTower,
      inTower: inTower,
      overextended: overextended,
      directionX: directionX,
      directionY: directionY,
    };
  };

  ArenaController.prototype.updateBodyblock = function (now, delta) {
    var state = this.drillState;
    if (!state) return;
    state.layout = this.bodyblockLayout();
    var layout = state.layout;
    var seconds = delta / 1000;
    var unitScale = this.arenaUnitScale();
    var hero = state.hero;
    state.tank.radius = hero.radius * unitScale;
    state.enemy.radius = (HERO_RADII.valla || 0.625) * unitScale;

    this.stats.travelDistance += moveEntityAlongRoute(
      state.tank,
      state.path,
      hero.speed * unitScale,
      seconds,
    );
    layout.obstacles.forEach(
      function (obstacle) {
        if (resolveCircleRect(state.tank, obstacle)) {
          this.stats.obstacleContacts += 1;
          var rebuilt = buildVisibilityRoute(
            state.tank,
            state.target,
            layout.obstacles,
            state.tank.radius,
            this.width,
            this.height,
          );
          state.path = rebuilt.waypoints;
        }
      }.bind(this),
    );

    if (now >= state.enemyRepathAt || !state.enemyPath.length) {
      var tankObstacle = {
        x: state.tank.x - state.tank.radius,
        y: state.tank.y - state.tank.radius,
        width: state.tank.radius * 2,
        height: state.tank.radius * 2,
      };
      var enemyObstacles = layout.obstacles.slice();
      if (distance(state.enemy, state.tank) > state.enemy.radius + state.tank.radius + 4) {
        enemyObstacles.push(tankObstacle);
      }
      var enemyDestination = layout.exit;
      var exitVector = normalizeVector(
        layout.exit.x - state.enemy.x,
        layout.exit.y - state.enemy.y,
      );
      var enemyToTank = {
        x: state.tank.x - state.enemy.x,
        y: state.tank.y - state.enemy.y,
      };
      var tankAhead = enemyToTank.x * exitVector.x + enemyToTank.y * exitVector.y;
      var contactDistance = state.enemy.radius + state.tank.radius;
      var tankClose = distance(state.enemy, state.tank) < contactDistance + unitScale * 5.6;
      if (tankAhead > -state.tank.radius && tankClose) {
        if (now >= state.enemyJukeAt) {
          var perpendicular = { x: -exitVector.y, y: exitVector.x };
          var lateralOffset = contactDistance + unitScale * randomBetween(1.6, 2.8);
          var forwardOffset = contactDistance + unitScale * randomBetween(1.2, 2.1);
          var candidates = [-1, 1].map(function (side) {
            var point = {
              x: clamp(
                state.tank.x + exitVector.x * forwardOffset + perpendicular.x * lateralOffset * side,
                state.enemy.radius + 20,
                this.width - state.enemy.radius - 20,
              ),
              y: clamp(
                state.tank.y + exitVector.y * forwardOffset + perpendicular.y * lateralOffset * side,
                state.enemy.radius + 20,
                this.height - state.enemy.radius - 20,
              ),
            };
            var blocked = layout.obstacles.some(function (obstacle) {
              return pointRectangleDistance(point, obstacle) < state.enemy.radius + 5;
            });
            var route = buildVisibilityRoute(
              state.enemy,
              point,
              enemyObstacles,
              state.enemy.radius,
              this.width,
              this.height,
            );
            return { side: side, point: point, route: route, cost: route.length + (blocked ? 10000 : 0) };
          }, this);
          candidates.sort(function (left, right) { return left.cost - right.cost; });
          var chosen = Math.random() < 0.72 ? candidates[0] : candidates[1];
          state.enemyJukeSide = chosen.side;
          state.enemyJukeAt = now + randomBetween(620, 980);
          state.enemyIntent = chosen.side < 0 ? "ФИНТ ВЛЕВО" : "ФИНТ ВПРАВО";
          enemyDestination = chosen.point;
        } else {
          var keepPerpendicular = { x: -exitVector.y, y: exitVector.x };
          enemyDestination = {
            x: clamp(
              state.tank.x + exitVector.x * contactDistance * 1.5 + keepPerpendicular.x * contactDistance * 1.45 * state.enemyJukeSide,
              state.enemy.radius + 20,
              this.width - state.enemy.radius - 20,
            ),
            y: clamp(
              state.tank.y + exitVector.y * contactDistance * 1.5 + keepPerpendicular.y * contactDistance * 1.45 * state.enemyJukeSide,
              state.enemy.radius + 20,
              this.height - state.enemy.radius - 20,
            ),
          };
        }
      } else {
        state.enemyIntent = "ИЩЕТ КОРОТКИЙ ПУТЬ";
      }
      var enemyRoute = buildVisibilityRoute(
        state.enemy,
        enemyDestination,
        enemyObstacles,
        state.enemy.radius,
        this.width,
        this.height,
      );
      state.enemyPath = enemyRoute.waypoints;
      state.enemyRepathAt = now + (tankClose ? 190 : 360);
    }
    var enemyPace = 0.76 + (this.difficulty - 1) * 0.1;
    moveEntityAlongRoute(
      state.enemy,
      state.enemyPath,
      4.8398 * unitScale * enemyPace,
      seconds,
    );
    separateCircles(state.tank, state.enemy);
    layout.obstacles.forEach(function (obstacle) {
      resolveCircleRect(state.enemy, obstacle);
    });

    var padding = 18;
    [state.tank, state.enemy].forEach(
      function (entity) {
        entity.x = clamp(entity.x, padding + entity.radius, this.width - padding - entity.radius);
        entity.y = clamp(entity.y, padding + entity.radius, this.height - padding - entity.radius);
      }.bind(this),
    );

    var conditions = this.bodyblockConditions();
    state.quality = conditions.quality;
    state.inTower = conditions.inTower;
    state.overextended = conditions.overextended;
    if (state.quality) {
      state.holdChain += delta;
      this.stats.blockMs += delta;
      this.setScore(this.score + delta * 0.075);
      if (state.holdChain >= 6000) {
        state.holdChain = 0;
        this.stats.holds += 1;
        this.addScore(350);
        this.showFeedback("ВЫХОД УДЕРЖАН · +350", true);
      }
    } else {
      state.holdChain = Math.max(0, state.holdChain - delta * 1.6);
    }
    if (state.inTower) {
      this.stats.towerMs += delta;
      this.setScore(this.score - delta * 0.055);
    }
    if (state.overextended) {
      this.stats.overextendMs += delta;
      this.setScore(this.score - delta * 0.035);
    }
    if (distance(state.enemy, layout.exit) <= layout.exit.radius) {
      this.stats.escapes += 1;
      this.addScore(-180);
      this.showFeedback("ПРОТИВНИК ПРОШЁЛ · −180", false);
      this.resetBodyblockRound(now, true);
    }

    if (state.inTower) this.contextText.textContent = "Опасно: хитбокс вошёл в радиус башни. Отдай новый приказ ПКМ.";
    else if (state.overextended) this.contextText.textContent = "Команда слишком далеко. Перестрой маршрут ближе к синей зоне.";
    else if (state.quality) this.contextText.textContent = "Качественный bodyblock: физические круги соприкасаются, выход закрыт.";
    else this.contextText.textContent =
      "ВРАГ: " +
      state.enemyIntent +
      ". ПКМ перестраивает путь; считывай финт и снова закрывай выход.";
    this.renderBodyblock(now);
  };

  ArenaController.prototype.renderBodyblock = function (now) {
    var state = this.drillState;
    var layout = state.layout;
    var context = this.context;
    this.renderArenaGrid();
    context.save();
    var teamGradient = context.createRadialGradient(
      layout.team.x,
      layout.team.y,
      12,
      layout.team.x,
      layout.team.y,
      layout.team.radius * 1.55,
    );
    teamGradient.addColorStop(0, "rgba(115, 168, 191, 0.25)");
    teamGradient.addColorStop(1, "rgba(115, 168, 191, 0)");
    context.fillStyle = teamGradient;
    context.beginPath();
    context.arc(layout.team.x, layout.team.y, layout.team.radius * 1.55, 0, Math.PI * 2);
    context.fill();
    context.restore();

    layout.towers.forEach(function (tower) {
      context.save();
      context.fillStyle = "rgba(184, 93, 97, 0.08)";
      context.strokeStyle = "rgba(184, 93, 97, 0.38)";
      context.setLineDash([7, 7]);
      context.beginPath();
      context.arc(tower.x, tower.y, tower.radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = "rgba(184, 93, 97, 0.9)";
      context.font = "900 10px Segoe UI, sans-serif";
      context.textAlign = "center";
      context.fillText("БАШНЯ", tower.x, tower.y);
      context.restore();
    });
    layout.obstacles.forEach(function (obstacle) {
      context.save();
      context.fillStyle = "rgba(25, 35, 44, 0.94)";
      context.strokeStyle = "rgba(197, 173, 118, 0.32)";
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 12);
      context.fill();
      context.stroke();
      context.restore();
    });

    var route = [{ x: state.tank.x, y: state.tank.y }].concat(state.path);
    if (route.length > 1) {
      context.save();
      context.strokeStyle = "rgba(115, 168, 191, 0.76)";
      context.lineWidth = 3;
      context.setLineDash([5, 7]);
      context.beginPath();
      context.moveTo(route[0].x, route[0].y);
      route.slice(1).forEach(function (waypoint) {
        context.lineTo(waypoint.x, waypoint.y);
      });
      context.stroke();
      context.restore();
    }
    if (now < state.commandMarkerUntil) {
      var markerPulse = 1 + Math.sin(now / 90) * 0.13;
      context.save();
      context.strokeStyle = state.commandProjected
        ? "rgba(184, 93, 97, 0.9)"
        : "rgba(115, 168, 191, 0.9)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(state.target.x, state.target.y, 13 * markerPulse, 0, Math.PI * 2);
      context.moveTo(state.target.x - 18, state.target.y);
      context.lineTo(state.target.x + 18, state.target.y);
      context.moveTo(state.target.x, state.target.y - 18);
      context.lineTo(state.target.x, state.target.y + 18);
      context.stroke();
      context.restore();
    }

    context.save();
    context.strokeStyle = state.quality ? "rgba(197, 173, 118, 0.78)" : "rgba(238, 242, 241, 0.26)";
    context.lineWidth = state.quality ? 5 : 2;
    context.setLineDash(state.quality ? [] : [10, 8]);
    context.beginPath();
    context.moveTo(state.enemy.x, state.enemy.y);
    var enemyRouteTarget = state.enemyPath.length ? state.enemyPath[0] : layout.exit;
    context.lineTo(enemyRouteTarget.x, enemyRouteTarget.y);
    context.stroke();
    context.restore();

    var exitPulse = 1 + Math.sin(now / 180) * 0.08;
    context.save();
    context.strokeStyle = "rgba(135, 190, 139, 0.9)";
    context.lineWidth = 4;
    context.beginPath();
    context.arc(layout.exit.x, layout.exit.y, layout.exit.radius * exitPulse, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "rgba(135, 190, 139, 0.9)";
    context.font = "900 10px Segoe UI, sans-serif";
    context.textAlign = "center";
    context.fillText("ВЫХОД", layout.exit.x, layout.exit.y + 4);
    context.restore();

    [state.enemy, state.tank].forEach(function (entity) {
      context.save();
      context.strokeStyle =
        entity === state.tank ? "rgba(115, 168, 191, 0.88)" : "rgba(184, 93, 97, 0.88)";
      context.lineWidth = 2;
      context.setLineDash([3, 3]);
      context.beginPath();
      context.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    });
    var enemyVisual = Math.max(18, state.enemy.radius);
    var tankVisual = Math.max(19, state.tank.radius);
    this.drawPortrait(avatar("valla"), state.enemy.x, state.enemy.y, enemyVisual, {
      ring: "#b85d61",
      health: 0.44,
      shadow: true,
      initials: "VA",
    });
    this.drawNameplate("ПРОТИВНИК", state.enemy.x, state.enemy.y + enemyVisual + 14, true);
    this.drawPortrait(avatar(state.hero.id), state.tank.x, state.tank.y, tankVisual, {
      ring: state.quality ? "#c5ad76" : "#73a8bf",
      health: 0.91,
      shadow: true,
      initials: state.hero.name.slice(0, 2),
    });
    this.drawNameplate(
      state.quality ? "BODYBLOCK" : "ВЫ · " + state.hero.name.toUpperCase(),
      state.tank.x,
      state.tank.y + tankVisual + 15,
      false,
    );
    context.save();
    context.fillStyle = "rgba(115, 168, 191, 0.88)";
    context.font = "900 10px Segoe UI, sans-serif";
    context.textAlign = "center";
    context.fillText("ЗОНА СОЮЗНОГО УРОНА", layout.team.x, layout.team.y + 4);
    context.restore();
  };

  ArenaController.prototype.buildResult = function () {
    var stats = this.stats;
    var score = this.score;
    var metrics = [{ label: "Счёт", value: formatNumber(score) }];
    var problem = "Сессия завершена. Повтори drill на большей сложности, когда метрики станут стабильными.";
    var detail = "Личный рекорд";

    if (this.drillId === "ability") {
      var accuracy = stats.shots ? Math.round((stats.hits / stats.shots) * 100) : 0;
      var center = stats.hits ? Math.round(stats.centerTotal / stats.hits) : 0;
      var recognition = stats.reactionCount
        ? Math.round(stats.reactionTotal / stats.reactionCount)
        : 0;
      var abilityBestReaction = Number.isFinite(stats.bestReaction)
        ? Math.round(stats.bestReaction)
        : 0;
      metrics.push(
        { label: "Попадания", value: stats.hits + " / " + stats.shots },
        { label: "Центр", value: center + "%" },
        {
          label: "Реакция ср. / лучш.",
          value: recognition
            ? recognition + " / " + abilityBestReaction + " мс"
            : "—",
        },
      );
      detail = accuracy + "% попаданий · центр " + center + "%";
      if (stats.wrong > stats.misses) {
        problem = "Ты быстрее кликаешь, чем распознаёшь приоритет. Сначала прочитай цель в callout.";
      } else if (center < 58 && stats.hits) {
        problem = "Цель выбрана верно, но способность ложится к краю хитбокса. Сократи последний рывок курсора.";
      } else if (stats.misses) {
        problem = "Часть окон закрывается без попадания. Держи курсор ближе к центру fight area.";
      } else {
        problem = "Приоритет и центр стабильны. Следующий шаг — увеличить скорость движения целей.";
      }
    } else if (this.drillId === "switch") {
      var switchAccuracy = stats.rounds ? Math.round((stats.correct / stats.rounds) * 100) : 0;
      var switchReaction = stats.rounds ? Math.round(stats.reactionTotal / stats.rounds) : 0;
      var switchDecision = stats.rounds
        ? Math.round(stats.decisionReactionTotal / stats.rounds)
        : 0;
      var excess = stats.rounds ? Math.round(stats.pathExcess / stats.rounds) : 0;
      var pressure = stats.pressureTotal
        ? Math.round((stats.pressureMs / stats.pressureTotal) * 100)
        : 0;
      metrics.push(
        { label: "Решения", value: stats.correct + " / " + stats.rounds },
        {
          label: "Цель + решение",
          value: switchReaction
            ? switchReaction + " мс · " + switchDecision + " мс"
            : "—",
        },
        { label: "Лишний путь", value: excess + " px" },
      );
      detail = switchAccuracy + "% решений · давление " + pressure + "%";
      if (stats.wrong > Math.max(1, stats.correct / 2)) {
        problem = "Смена внимания происходит, но контекст engage и peel читается нестабильно. Сначала реши, потом кликай.";
      } else if (excess > 120) {
        problem = "Решение верное, но курсор делает лишнюю дугу. Переключайся прямой траекторией от текущего фокуса.";
      } else if (pressure < 55) {
        problem = "До сигнала теряется давление на основной цели. Держи исходный фокус, пока контекст не изменился.";
      } else {
        problem = "Switch чистый. Усложни сценарий, чтобы сократить окно решения.";
      }
    } else if (this.drillId === "interrupt") {
      var decisionRate = stats.decisions
        ? Math.round((stats.correct / stats.decisions) * 100)
        : 0;
      var averageReaction = stats.interrupts
        ? Math.round(stats.reactionTotal / stats.interrupts)
        : 0;
      var bestReaction = Number.isFinite(stats.bestReaction)
        ? Math.round(stats.bestReaction) + " мс"
        : "—";
      metrics.push(
        { label: "Решения", value: stats.correct + " / " + stats.decisions },
        { label: "Средняя реакция", value: averageReaction ? averageReaction + " мс" : "—" },
        { label: "Лучшее окно", value: bestReaction },
      );
      detail = decisionRate + "% решений · " + (averageReaction ? averageReaction + " мс" : "без interrupt");
      if (stats.unstoppablePress) {
        problem = "Ты реагируешь быстро, но тратишь контроль в Unstoppable. Проверяй статус над целью.";
      } else if (stats.falsePress) {
        problem = "Есть реакции на feint и неопасные способности. Дожидайся подтверждения опасного каста.";
      } else if (stats.misses) {
        problem = "Решение распознано поздно: опасный каст успевает завершиться. Держи палец на Q до появления окна.";
      } else {
        problem = "Распознавание и исполнение совпали. Увеличь сложность для более коротких кастов.";
      }
    } else if (this.drillId === "bodyblock") {
      var blockSeconds = (stats.blockMs / 1000).toFixed(1).replace(".", ",");
      var dangerSeconds = ((stats.towerMs + stats.overextendMs) / 1000)
        .toFixed(1)
        .replace(".", ",");
      var commandReaction = stats.commandCount
        ? Math.round(stats.commandReactionTotal / stats.commandCount)
        : 0;
      var pathEfficiency = this.drillState.plannedDistance
        ? Math.round(
            clamp(stats.travelDistance / this.drillState.plannedDistance, 0, 1) * 100,
          )
        : 0;
      metrics.push(
        { label: "Bodyblock", value: blockSeconds + " с" },
        {
          label: "Команда движения",
          value: commandReaction ? commandReaction + " мс" : "—",
        },
        { label: "Эффективность пути", value: pathEfficiency + "%" },
      );
      detail =
        blockSeconds +
        " с контроля · " +
        stats.holds +
        " удерж. · " +
        stats.escapes +
        " прорыв.";
      if (stats.towerMs > 1800) {
        problem = "Ты закрываешь выход, но слишком долго стоишь под башней. Смещай линию блока ближе к команде.";
      } else if (stats.overextendMs > 2200) {
        problem = "Bodyblock отрывает тебя от союзного урона. Выбирай более короткую траекторию перехвата.";
      } else if (stats.escapes) {
        problem = "Противник прорывается по краю модели. Держи небольшой запас впереди его вектора движения.";
      } else {
        problem = "Позиция удерживается без лишнего риска. Увеличь скорость противника на следующем уровне.";
      }
      if (Number(dangerSeconds.replace(",", ".")) > 0) {
        problem += " Опасная позиция: " + dangerSeconds + " с.";
      }
    }

    return { metrics: metrics, problem: problem, detail: detail };
  };

  ArenaController.prototype.finish = function () {
    if (this.phase !== "running") return;
    this.cancelFrame();
    this.phase = "report";
    this.actions.classList.remove("is-visible");
    this.cast.classList.remove("is-visible");
    this.callout.textContent = "";
    this.timeElement.textContent = "0:00";
    var result = this.buildResult();
    var previous = this.progress.best[this.drillId];
    var isBest = !previous || this.score > previous.score;
    if (isBest) {
      this.progress.best[this.drillId] = {
        score: this.score,
        detail: result.detail,
      };
      saveProgress(this.progress);
      updateBestCards(this.root, this.progress);
    }
    if (this.warmup && this.warmup.active) {
      this.warmup.scores[this.warmup.index] = this.score;
    }
    this.renderReport(result, isBest);
  };

  ArenaController.prototype.renderReport = function (result, isBest) {
    var self = this;
    var drill = DRILLS[this.drillId];
    var nextLabel = this.warmup && this.warmup.active ? "Следующий этап" : "Следующий drill";
    this.brief.hidden = true;
    this.brief.innerHTML = "";
    this.report.hidden = false;
    this.report.innerHTML = [
      "<span>",
      isBest ? "НОВЫЙ ЛИЧНЫЙ РЕКОРД" : "ОТЧЁТ СЕССИИ",
      "</span>",
      '<h2 id="arena-title">',
      drill.title,
      "</h2>",
      '<div class="arena-report__metrics">',
      result.metrics
        .map(function (metric) {
          return "<div><span>" + metric.label + "</span><strong>" + metric.value + "</strong></div>";
        })
        .join(""),
      "</div>",
      '<div class="arena-report__problem"><span>РАЗБОР</span><p>',
      result.problem,
      "</p></div>",
      '<div class="arena-report__actions">',
      '<button class="mechanics-button" type="button" data-report-repeat>Повторить</button>',
      '<button class="mechanics-button mechanics-button--ghost" type="button" data-report-harder>Усложнить</button>',
      '<button class="mechanics-button mechanics-button--ghost" type="button" data-report-next>',
      nextLabel,
      "</button>",
      '<button class="mechanics-button mechanics-button--ghost" type="button" data-report-exit>Закрыть</button>',
      "</div>",
    ].join("");

    this.report.querySelector("[data-report-repeat]").addEventListener("click", function () {
      self.open(self.drillId, {
        duration: self.duration,
        difficulty: self.difficulty,
        warmup: self.warmup,
      });
    });
    this.report.querySelector("[data-report-harder]").addEventListener("click", function () {
      self.difficulty = Math.min(4, self.difficulty + 1);
      self.progress.difficulty[self.drillId] = self.difficulty;
      saveProgress(self.progress);
      self.open(self.drillId, {
        duration: self.duration,
        difficulty: self.difficulty,
        warmup: self.warmup,
      });
    });
    this.report.querySelector("[data-report-next]").addEventListener("click", function () {
      self.nextDrill();
    });
    this.report.querySelector("[data-report-exit]").addEventListener("click", function () {
      self.close();
    });
    this.report.querySelector("[data-report-repeat]").focus();
  };

  ArenaController.prototype.nextDrill = function () {
    var order = ["ability", "switch", "interrupt", "bodyblock"];
    if (this.warmup && this.warmup.active) {
      if (this.warmup.index < order.length - 1) {
        this.warmup.index += 1;
        this.open(order[this.warmup.index], {
          duration: 60,
          warmup: this.warmup,
        });
      } else {
        this.startDecisionStage(this.warmup);
      }
      return;
    }
    var index = order.indexOf(this.drillId);
    this.open(order[(index + 1) % order.length]);
  };

  ArenaController.prototype.startWarmup = function () {
    if (this.decisionTimer) window.clearInterval(this.decisionTimer);
    if (this.decisionBanner && this.decisionBanner.parentNode) {
      this.decisionBanner.parentNode.removeChild(this.decisionBanner);
    }
    this.decisionBanner = null;
    var warmup = {
      active: true,
      index: 0,
      scores: [],
      startedAt: Date.now(),
    };
    this.open("ability", { duration: 60, warmup: warmup });
  };

  ArenaController.prototype.startDecisionStage = function (warmup) {
    var self = this;
    this.cancelFrame();
    this.phase = "decision";
    this.overlay.hidden = true;
    this.overlay.classList.remove("is-opening");
    document.body.classList.remove("mechanics-is-open");
    warmup.index = 4;
    this.warmup = warmup;
    this.selectMode("tactics", true);

    if (this.decisionBanner && this.decisionBanner.parentNode) {
      this.decisionBanner.parentNode.removeChild(this.decisionBanner);
    }
    this.decisionBanner = makeElement(
      "section",
      "decision-warmup",
      [
        '<div class="decision-warmup__head"><span>ЭТАП 5 / 5 · DECISION LAB</span><time data-decision-time>2:00</time></div>',
        "<h3>Примени механику в тактической ситуации</h3>",
        "<p>Выбери любой модуль ниже: проверь вход, назначь контроль и сформулируй короткий call. Таймер фиксирует последние две минуты разминки.</p>",
        '<div class="decision-warmup__track"><i data-decision-progress></i></div>',
        '<div class="decision-warmup__steps"><span>Точность</span><span>Switch</span><span>Interrupt</span><span>Bodyblock</span><strong>Decision</strong></div>',
        '<button class="mechanics-button" type="button" data-finish-decision>Завершить разминку</button>',
      ].join(""),
    );
    this.tactics.insertBefore(this.decisionBanner, this.tactics.firstChild);
    this.decisionEndsAt = Date.now() + 120000;

    function tickDecision() {
      if (!self.decisionBanner) return;
      var remaining = Math.max(0, self.decisionEndsAt - Date.now());
      var elapsed = 1 - remaining / 120000;
      self.decisionBanner.querySelector("[data-decision-time]").textContent = formatTime(remaining);
      self.decisionBanner.querySelector("[data-decision-progress]").style.transform =
        "scaleX(" + clamp(elapsed, 0, 1) + ")";
      if (remaining <= 0) self.completeWarmup();
    }

    this.decisionBanner
      .querySelector("[data-finish-decision]")
      .addEventListener("click", this.completeWarmup.bind(this));
    tickDecision();
    this.decisionTimer = window.setInterval(tickDecision, 250);
    window.setTimeout(function () {
      if (self.decisionBanner) {
        self.decisionBanner.scrollIntoView({
          behavior: reducedMotion.matches ? "auto" : "smooth",
          block: "center",
        });
      }
    }, 380);
  };

  ArenaController.prototype.completeWarmup = function () {
    if (!this.decisionBanner) return;
    if (this.decisionTimer) window.clearInterval(this.decisionTimer);
    this.decisionTimer = 0;
    this.decisionBanner.classList.add("is-complete");
    this.decisionBanner.querySelector("[data-decision-time]").textContent = "ГОТОВО";
    this.decisionBanner.querySelector("[data-decision-progress]").style.transform = "scaleX(1)";
    var button = this.decisionBanner.querySelector("[data-finish-decision]");
    button.textContent = "Разминка завершена";
    button.disabled = true;
    if (this.warmup) this.warmup.active = false;
    this.showToast("Танковая разминка завершена. Рука, внимание и решение собраны в одну последовательность.");
  };

  ArenaController.prototype.showToast = function (message) {
    if (!this.toast) {
      this.toast = makeElement("div", "mechanics-toast");
      this.toast.setAttribute("role", "status");
      document.body.appendChild(this.toast);
    }
    this.toast.textContent = message;
    this.toast.classList.remove("is-visible");
    void this.toast.offsetWidth;
    this.toast.classList.add("is-visible");
  };

  /* DRILL_METHODS */

  function boot() {
    initReader();
    initLab();
  }

  var pageObserver = new MutationObserver(function (records) {
    var pageStructureChanged = records.some(function (record) {
      return Array.prototype.slice
        .call(record.addedNodes)
        .concat(Array.prototype.slice.call(record.removedNodes))
        .some(function (node) {
          if (node.nodeType !== 1) return false;
          return (
            node.matches("main, .lab-page, .reader-layout, .reader-nav") ||
            Boolean(
              node.querySelector(
                "main, .lab-page, .reader-layout, .reader-nav",
              ),
            )
          );
        });
    });
    if (pageStructureChanged) scheduleBoot();
  });
  var enhancementsStarted = false;

  function startEnhancements() {
    if (enhancementsStarted) return;
    enhancementsStarted = true;
    boot();
    pageObserver.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(boot, 900);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        window.setTimeout(startEnhancements, 1400);
      },
      { once: true },
    );
  } else {
    window.setTimeout(startEnhancements, 900);
  }
})();
