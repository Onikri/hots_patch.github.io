(function () {
  "use strict";

  var BASE = "/hots_tank.github.io";
  var ACTIONS = {
    camp: { label: "Кемп", short: "CAMP" },
    lane: { label: "Линия / соло", short: "LANE" },
    objective: { label: "Объект", short: "OBJ" },
    bush: { label: "Куст / обзор", short: "VISION" },
    hold: { label: "Удерживать позицию", short: "HOLD" },
    retreat: { label: "Путь отхода", short: "EXIT" },
  };
  var MAP_LAYERS = {
    camp: { label: "Кемпы", short: "C" },
    bush: { label: "Кусты", short: "B" },
    objective: { label: "Объекты", short: "O" },
    boss: { label: "Боссы", short: "X" },
    turret: { label: "Турели", short: "T" },
    vision: { label: "Обзор", short: "V" },
  };
  var PHASES = {
    fp: {
      title: "First pick",
      description: "Команды ещё не раскрыты. Нужен надёжный танк под карту и широкий план игры.",
      allies: 0,
      enemies: 0,
    },
    mid: {
      title: "Пик в середине",
      description: "Видны два союзника и две угрозы. Балансируй синергию и ответный план.",
      allies: 2,
      enemies: 2,
    },
    last: {
      title: "Last pick",
      description: "Костяк обеих команд известен. Закрой слабое место и накажи конкретные угрозы.",
      allies: 4,
      enemies: 4,
    },
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function average(values, fallback) {
    var useful = values.filter(function (value) {
      return typeof value === "number";
    });
    if (!useful.length) return fallback;
    return useful.reduce(function (sum, value) {
      return sum + value;
    }, 0) / useful.length;
  }

  function chooseMany(items, count, excluded) {
    var blocked = new Set(excluded || []);
    var pool = items.filter(function (item) {
      return !blocked.has(item.name);
    });
    var result = [];
    while (pool.length && result.length < count) {
      var index = Math.floor(Math.random() * pool.length);
      result.push(pool.splice(index, 1)[0].name);
    }
    return result;
  }

  function heroAvatar(hero) {
    return hero ? hero.avatar : "";
  }

  function repairThreatRange() {
    var lab = document.querySelector(".geometry-lab");
    var field = lab ? lab.querySelector(".geometry-field") : null;
    if (!lab || !field || field.dataset.geometryV2) return;
    field.dataset.geometryV2 = "true";
    field.innerHTML = [
      '<svg class="geometry-stage-v2" viewBox="0 0 100 100" role="img" aria-label="Дистанция между бэклайном, танком и противником">',
      '<rect class="geometry-safe-v2" x="4" y="12" width="48" height="76" rx="9"/>',
      '<circle class="geometry-threat-v2" cx="78" cy="50" r="18"/>',
      '<line class="geometry-link-v2" x1="29" y1="66" x2="52" y2="50"/>',
      '<line class="geometry-engage-v2" x1="52" y1="50" x2="78" y2="50"/>',
      '<g class="geometry-unit-v2 geometry-unit-v2--dd" transform="translate(29 66)"><circle r="7"/><text>DD</text></g>',
      '<g class="geometry-unit-v2 geometry-unit-v2--mt" transform="translate(52 50)"><circle r="7"/><text>MT</text></g>',
      '<g class="geometry-unit-v2 geometry-unit-v2--en" transform="translate(78 50)"><circle r="7"/><text>EN</text></g>',
      '<text class="geometry-label-v2" x="8" y="23">FOLLOW-UP</text>',
      '<text class="geometry-label-v2 geometry-label-v2--danger" x="72" y="22">THREAT</text>',
      "</svg>",
    ].join("");

    var svg = field.querySelector("svg");
    var backline = field.querySelector(".geometry-unit-v2--dd");
    var enemy = field.querySelector(".geometry-unit-v2--en");
    var link = field.querySelector(".geometry-link-v2");
    var engage = field.querySelector(".geometry-engage-v2");
    var threat = field.querySelector(".geometry-threat-v2");

    function update() {
      var inputs = lab.querySelectorAll('input[type="range"]');
      var spacing = inputs[0] ? Number(inputs[0].value) : 52;
      var threatValue = inputs[1] ? Number(inputs[1].value) : 67;
      var ddX = clamp(52 - spacing * 0.44, 12, 41);
      var ddY = clamp(66 + (spacing - 52) * 0.08, 61, 72);
      var enemyX = clamp(57 + threatValue * 0.31, 68, 88);
      var threatRadius = clamp(8 + threatValue * 0.15, 13, 22);
      backline.setAttribute("transform", "translate(" + ddX + " " + ddY + ")");
      enemy.setAttribute("transform", "translate(" + enemyX + " 50)");
      link.setAttribute("x1", ddX);
      link.setAttribute("y1", ddY);
      link.setAttribute("x2", 52);
      link.setAttribute("y2", 50);
      engage.setAttribute("x1", 52);
      engage.setAttribute("y1", 50);
      engage.setAttribute("x2", enemyX);
      engage.setAttribute("y2", 50);
      threat.setAttribute("cx", enemyX);
      threat.setAttribute("r", threatRadius);
      svg.style.setProperty("--safe-width", Math.max(36, ddX + 23) + "%");
    }

    lab.addEventListener("input", update);
    lab.addEventListener("change", update);
    update();
  }

  function TrainingSuite(root, data) {
    this.root = root;
    this.data = data;
    this.mapState = {
      mapIndex: 1,
      scenarioIndex: 0,
      mode: "learn",
      selectedAction: "bush",
      visibleLayers: {
        camp: true,
        bush: true,
        objective: true,
        boss: true,
        turret: true,
        vision: true,
      },
      plan: [],
      result: null,
    };
    this.draftState = {
      mode: "learn",
      phase: "mid",
      mapName: data.maps[0].name,
      allies: [],
      enemies: [],
      selectedTank: "",
      result: null,
    };
    this.heroByName = new Map(
      data.draft.heroes.map(function (hero) {
        return [hero.name, hero];
      }),
    );
    this.newDraftScenario();
    this.renderShell();
    this.bindEvents();
    this.renderMap();
    this.renderDraft();
  }

  TrainingSuite.prototype.renderShell = function () {
    this.root.innerHTML = [
      '<section class="training-expansion__head">',
      '<div><span>DECISION LAB / V2</span><h2>Решение видно<br/><em>на карте и в драфте.</em></h2></div>',
      '<p>Не угадывай скрытое правило. Каждый режим сначала объясняет цель, управление и формулу оценки, а после попытки разбирает решение.</p>',
      "</section>",
      '<nav class="training-expansion__nav" aria-label="Новые тактические тренажёры">',
      '<button class="is-active" type="button" data-suite-tab="map"><small>05</small><strong>Map Decision</strong><span>15 карт · план на миникарте</span></button>',
      '<button type="button" data-suite-tab="draft"><small>06</small><strong>Tank Draft</strong><span>13 × 90 матчапов</span></button>',
      "</nav>",
      '<section class="suite-panel" data-suite-panel="map"></section>',
      '<section class="suite-panel" data-suite-panel="draft" hidden></section>',
      '<footer class="training-method-note"><strong>МЕТОДОЛОГИЯ</strong><span>' +
        escapeHtml(this.data.meta.notice) +
        '</span><em>Патч ' +
        escapeHtml(this.data.meta.patch) +
        "</em></footer>",
    ].join("");
    this.mapPanel = this.root.querySelector('[data-suite-panel="map"]');
    this.draftPanel = this.root.querySelector('[data-suite-panel="draft"]');
  };

  TrainingSuite.prototype.bindEvents = function () {
    var self = this;
    this.root.addEventListener("click", function (event) {
      var tab = event.target.closest("[data-suite-tab]");
      var mapMode = event.target.closest("[data-map-mode]");
      var mapAction = event.target.closest("[data-map-action]");
      var mapUndo = event.target.closest("[data-map-undo]");
      var mapReset = event.target.closest("[data-map-reset]");
      var mapCheck = event.target.closest("[data-map-check]");
      var mapLayer = event.target.closest("[data-map-layer]");
      var mapSurface = event.target.closest("[data-map-surface]");
      var draftMode = event.target.closest("[data-draft-mode]");
      var draftPhase = event.target.closest("[data-draft-phase]");
      var draftTank = event.target.closest("[data-draft-tank]");
      var draftNew = event.target.closest("[data-draft-new]");

      if (tab) self.selectSuiteTab(tab.dataset.suiteTab);
      if (mapMode) {
        self.mapState.mode = mapMode.dataset.mapMode;
        self.resetMapPlan();
      }
      if (mapAction) {
        self.mapState.selectedAction = mapAction.dataset.mapAction;
        self.renderMap();
      }
      if (mapUndo) {
        self.mapState.plan.pop();
        self.mapState.result = null;
        self.renderMap();
      }
      if (mapReset) self.resetMapPlan();
      if (mapCheck) self.checkMapPlan();
      if (mapLayer) {
        var layerName = mapLayer.dataset.mapLayer;
        self.mapState.visibleLayers[layerName] = !self.mapState.visibleLayers[layerName];
        self.renderMap();
      }
      if (mapSurface && !event.target.closest(".map-plan-marker")) {
        self.placeMapMarker(event, mapSurface);
      }
      if (draftMode) {
        self.draftState.mode = draftMode.dataset.draftMode;
        self.draftState.selectedTank = "";
        self.draftState.result = null;
        self.renderDraft();
      }
      if (draftPhase) {
        self.draftState.phase = draftPhase.dataset.draftPhase;
        self.newDraftScenario();
        self.renderDraft();
      }
      if (draftTank) self.selectDraftTank(draftTank.dataset.draftTank);
      if (draftNew) {
        self.newDraftScenario();
        self.renderDraft();
      }
    });

    this.root.addEventListener("change", function (event) {
      if (event.target.matches("[data-map-select]")) {
        self.mapState.mapIndex = Number(event.target.value);
        self.mapState.scenarioIndex = 0;
        self.resetMapPlan();
      } else if (event.target.matches("[data-map-scenario]")) {
        self.mapState.scenarioIndex = Number(event.target.value);
        self.resetMapPlan();
      } else if (event.target.matches("[data-draft-map]")) {
        self.draftState.mapName = event.target.value;
        self.draftState.selectedTank = "";
        self.draftState.result = null;
        self.renderDraft();
      } else if (event.target.matches("[data-draft-ally]")) {
        self.draftState.allies[Number(event.target.dataset.draftAlly)] = event.target.value;
        self.draftState.selectedTank = "";
        self.draftState.result = null;
        self.renderDraft();
      } else if (event.target.matches("[data-draft-enemy]")) {
        self.draftState.enemies[Number(event.target.dataset.draftEnemy)] = event.target.value;
        self.draftState.selectedTank = "";
        self.draftState.result = null;
        self.renderDraft();
      }
    });
  };

  TrainingSuite.prototype.selectSuiteTab = function (name) {
    this.root.querySelectorAll("[data-suite-tab]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.suiteTab === name);
    });
    this.mapPanel.hidden = name !== "map";
    this.draftPanel.hidden = name !== "draft";
  };

  TrainingSuite.prototype.currentMap = function () {
    return this.data.maps[this.mapState.mapIndex] || this.data.maps[0];
  };

  TrainingSuite.prototype.currentScenario = function () {
    var map = this.currentMap();
    return map.scenarios[this.mapState.scenarioIndex] || map.scenarios[0];
  };

  TrainingSuite.prototype.resetMapPlan = function () {
    this.mapState.plan = [];
    this.mapState.result = null;
    this.renderMap();
  };

  TrainingSuite.prototype.nearestMapPoint = function (type, x, y) {
    var markers = this.currentMap().markers[type] || [];
    if (!markers.length) return null;
    return markers.reduce(function (nearest, marker) {
      var markerDistance = Math.hypot(marker.x - x, marker.y - y);
      return !nearest || markerDistance < nearest.distance
        ? { marker: marker, distance: markerDistance }
        : nearest;
    }, null);
  };

  TrainingSuite.prototype.placeMapMarker = function (event, surface) {
    if (this.mapState.plan.length >= 3) return;
    var rect = surface.getBoundingClientRect();
    var x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    var y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
    var type = this.mapState.selectedAction;
    var nearest = this.nearestMapPoint(type, x, y);
    if (nearest && nearest.distance <= 18) {
      x = nearest.marker.x;
      y = nearest.marker.y;
    }
    this.mapState.plan.push({
      type: type,
      x: x,
      y: y,
      label: nearest && nearest.distance <= 18 ? nearest.marker.label : ACTIONS[type].label,
    });
    this.mapState.result = null;
    this.renderMap();
  };

  TrainingSuite.prototype.checkMapPlan = function () {
    var expected = this.currentScenario().expected;
    var plan = this.mapState.plan;
    var exact = 0;
    var present = 0;
    expected.forEach(function (type, index) {
      if (plan[index] && plan[index].type === type) exact += 1;
      if (plan.some(function (step) { return step.type === type; })) present += 1;
    });
    var score = Math.max(0, exact * 30 + (present - exact) * 15 + (plan.length === 3 ? 10 : 0));
    this.mapState.result = {
      score: score,
      good: exact === expected.length,
      title: exact === expected.length ? "ПЛАН СОБРАН" : "ПЕРЕСТРОЙ ПОСЛЕДОВАТЕЛЬНОСТЬ",
      detail:
        exact === expected.length
          ? "Три команды совпали с базовым планом и стоят в правильном порядке."
          : "Нужны: " + expected.map(function (type) { return ACTIONS[type].label; }).join(" → ") + ".",
    };
    this.renderMap();
  };

  TrainingSuite.prototype.renderMap = function () {
    var state = this.mapState;
    var map = this.currentMap();
    var scenario = this.currentScenario();
    var result = state.result;
    var mapOptions = this.data.maps
      .map(function (item, index) {
        return '<option value="' + index + '"' + (index === state.mapIndex ? " selected" : "") + ">" + escapeHtml(item.name) + "</option>";
      })
      .join("");
    var scenarioOptions = map.scenarios
      .map(function (item, index) {
        return '<option value="' + index + '"' + (index === state.scenarioIndex ? " selected" : "") + ">" + escapeHtml(item.title) + "</option>";
      })
      .join("");
    var expectedGuide = scenario.expected
      .map(function (type, index) {
        return "<span><b>" + (index + 1) + "</b>" + escapeHtml(ACTIONS[type].label) + "</span>";
      })
      .join("");
    var planMarkers = state.plan
      .map(function (step, index) {
        return '<button class="map-plan-marker map-plan-marker--' +
          step.type +
          '" type="button" style="--x:' +
          step.x +
          "%;--y:" +
          step.y +
          '%" title="' +
          escapeHtml(step.label) +
          '"><b>' +
          (index + 1) +
          "</b><span>" +
          escapeHtml(ACTIONS[step.type].short) +
          "</span></button>";
      })
      .join("");
    var actionButtons = Object.keys(ACTIONS)
      .map(function (type) {
        return '<button type="button" data-map-action="' +
          type +
          '" class="' +
          (state.selectedAction === type ? "is-active" : "") +
          '"><i></i><span><strong>' +
          escapeHtml(ACTIONS[type].label) +
          "</strong><small>" +
          escapeHtml(ACTIONS[type].short) +
          "</small></span></button>";
      })
      .join("");
    var layerButtons = Object.keys(MAP_LAYERS)
      .map(function (type) {
        var count = (map.markers[type] || []).length;
        var visible = state.visibleLayers[type];
        return '<button type="button" data-map-layer="' +
          type +
          '" class="map-layer-toggle map-layer-toggle--' +
          type +
          (visible ? " is-active" : "") +
          '" aria-pressed="' +
          String(visible) +
          '"><i>' +
          escapeHtml(MAP_LAYERS[type].short) +
          '</i><span>' +
          escapeHtml(MAP_LAYERS[type].label) +
          '</span><b>' +
          count +
          "</b></button>";
      })
      .join("");
    var annotationMarkers = Object.keys(MAP_LAYERS)
      .map(function (type) {
        if (!state.visibleLayers[type]) return "";
        return (map.markers[type] || [])
          .map(function (marker) {
            return '<span class="map-annotation map-annotation--' +
              type +
              '" style="--x:' +
              marker.x +
              "%;--y:" +
              marker.y +
              '%" title="' +
              escapeHtml(marker.label || MAP_LAYERS[type].label) +
              '"><i>' +
              escapeHtml(MAP_LAYERS[type].short) +
              "</i></span>";
          })
          .join("");
      })
      .join("");

    this.mapPanel.innerHTML = [
      '<header class="suite-panel__header"><div><span>05 / MAP DECISION</span><h3>План до объекта</h3><p>Выбери команду, затем поставь её на карту. Три метки образуют последовательный колл.</p></div>',
      '<div class="suite-mode" role="group" aria-label="Режим карты"><button type="button" data-map-mode="learn" class="' +
        (state.mode === "learn" ? "is-active" : "") +
        '">Обучение</button><button type="button" data-map-mode="exam" class="' +
        (state.mode === "exam" ? "is-active" : "") +
        '">Экзамен</button></div></header>',
      '<div class="map-trainer-controls"><label><span>Карта</span><select data-map-select>' +
        mapOptions +
        '</select></label><label><span>Ситуация</span><select data-map-scenario>' +
        scenarioOptions +
        "</select></label></div>",
      '<div class="map-scenario"><div><span>СИТУАЦИЯ</span><h4>' +
        escapeHtml(scenario.title) +
        "</h4><p>" +
        escapeHtml(scenario.situation) +
        '</p></div><dl><div><dt>Карта</dt><dd>' +
        escapeHtml(map.name) +
        "</dd></div><div><dt>Главная линия</dt><dd>" +
        escapeHtml(map.macro.main) +
        "</dd></div><div><dt>Объект</dt><dd>" +
        escapeHtml(map.macro.objective) +
        "</dd></div></dl></div>",
      state.mode === "learn"
        ? '<div class="map-learning-sequence"><span>БАЗОВЫЙ ПЛАН</span><div>' + expectedGuide + "</div></div>"
        : '<div class="map-exam-note"><b>ЭКЗАМЕН</b><span>Подсказка скрыта. Собери три команды и проверь порядок.</span></div>',
      '<div class="map-layer-bar"><div><span>СЛОИ MAPANNOTATOR</span><small>Оставлены только игровые точки — без маршрутов волн и таймеров.</small></div><nav aria-label="Слои аннотированной карты">' +
        layerButtons +
        "</nav></div>",
      '<div class="map-workspace"><div class="map-surface" data-map-surface style="--map-aspect:' +
        map.imageSize[0] +
        "/" +
        map.imageSize[1] +
        ";--map-image:url(\'" +
        escapeHtml(map.image) +
        "')\">" +
        '<img src="' +
        escapeHtml(map.image) +
        '" alt="Миникарта: ' +
        escapeHtml(map.name) +
        '" draggable="false"/>' +
        '<div class="map-surface__grid" aria-hidden="true"></div>' +
        '<div class="map-annotation-canvas" aria-hidden="true">' +
        annotationMarkers +
        "</div>" +
        planMarkers +
        '<div class="map-surface__hint">КЛИК ПО КАРТЕ · МЕТКА ' +
        Math.min(3, state.plan.length + 1) +
        " / 3</div></div>" +
        '<aside class="map-actions"><div><span>1 · ВЫБЕРИ КОМАНДУ</span>' +
        actionButtons +
        '</div><div class="map-plan-list"><span>2 · ТЕКУЩИЙ ПЛАН</span>' +
        (state.plan.length
          ? state.plan
              .map(function (step, index) {
                return "<p><b>" + (index + 1) + "</b><strong>" + escapeHtml(ACTIONS[step.type].label) + "</strong><small>" + escapeHtml(step.label) + "</small></p>";
              })
              .join("")
          : "<em>Поставь первую метку на миникарте.</em>") +
        '</div><div class="map-actions__buttons"><button type="button" data-map-undo ' +
        (state.plan.length ? "" : "disabled") +
        '>Отменить</button><button type="button" data-map-reset>Сбросить</button><button type="button" data-map-check ' +
        (state.plan.length === 3 ? "" : "disabled") +
        ">Проверить план</button></div></aside></div>",
      result
        ? '<section class="map-result ' +
          (result.good ? "is-good" : "is-warning") +
          '"><div><span>РАЗБОР</span><strong>' +
          escapeHtml(result.title) +
          "</strong><p>" +
          escapeHtml(result.detail) +
          "</p></div><b>" +
          result.score +
          '<small>/ 100</small></b><aside><span>ЛОГИКА КАРТЫ</span><p>' +
          escapeHtml(scenario.answer) +
          "</p><em>" +
          escapeHtml(map.macro.special) +
          "</em></aside></section>"
        : "",
      '<footer class="map-source-strip"><span>АННОТАЦИИ</span><b>' +
        map.markers.camp.length +
        " кемпов · " +
        map.markers.objective.length +
        " точек объекта · " +
        map.markers.bush.length +
        ' кустов</b><em>Точные слои MapAnnotator · Python build_map_database.py</em></footer>',
    ].join("");
  };

  TrainingSuite.prototype.newDraftScenario = function () {
    var state = this.draftState;
    var phase = PHASES[state.phase];
    state.allies = chooseMany(this.data.draft.heroes, phase.allies, []);
    state.enemies = chooseMany(this.data.draft.heroes, phase.enemies, state.allies);
    state.selectedTank = "";
    state.result = null;
  };

  TrainingSuite.prototype.scoreTank = function (tank) {
    var state = this.draftState;
    var mapScore = tank.goodMaps.indexOf(state.mapName) >= 0 ? 9 : tank.badMaps.indexOf(state.mapName) >= 0 ? -9 : 0;
    var synergyScores = state.allies.map(function (name) {
      return tank.pairs[name] ? tank.pairs[name].synergy : 5;
    });
    var counterScores = state.enemies.map(function (name) {
      return tank.pairs[name] ? tank.pairs[name].counter : 5;
    });
    var synergy = average(synergyScores, 5);
    var counter = average(counterScores, 5);
    var reliability = (tank.demand - 5) * 1.6;
    var total = clamp(Math.round(62 + mapScore + (synergy - 5) * 4 + (counter - 5) * 4 + reliability), 0, 100);
    return {
      total: total,
      map: mapScore,
      synergy: synergy,
      counter: counter,
      reliability: reliability,
    };
  };

  TrainingSuite.prototype.rankedTanks = function () {
    var self = this;
    return this.data.draft.tanks
      .map(function (tank) {
        return { tank: tank, score: self.scoreTank(tank) };
      })
      .sort(function (left, right) {
        return right.score.total - left.score.total;
      });
  };

  TrainingSuite.prototype.selectDraftTank = function (tankId) {
    var ranked = this.rankedTanks();
    var rank = ranked.findIndex(function (entry) {
      return entry.tank.id === tankId;
    });
    this.draftState.selectedTank = tankId;
    this.draftState.result = {
      rank: rank + 1,
      best: ranked[0].tank.id === tankId,
      entry: ranked[rank],
      bestEntry: ranked[0],
    };
    this.renderDraft();
  };

  TrainingSuite.prototype.heroSelectOptions = function (selected) {
    return this.data.draft.heroes
      .map(function (hero) {
        return '<option value="' +
          escapeHtml(hero.name) +
          '"' +
          (hero.name === selected ? " selected" : "") +
          ">" +
          escapeHtml(hero.name) +
          " · " +
          escapeHtml(hero.role) +
          "</option>";
      })
      .join("");
  };

  TrainingSuite.prototype.draftSlotsMarkup = function (names, enemy) {
    var self = this;
    if (!names.length) {
      return '<div class="draft-empty-slots"><strong>Состав ещё не раскрыт</strong><span>Оцени карту и надёжность first pick.</span></div>';
    }
    return names
      .map(function (name, index) {
        var hero = self.heroByName.get(name);
        return '<label class="draft-hero-slot ' +
          (enemy ? "draft-hero-slot--enemy" : "") +
          '"><img src="' +
          escapeHtml(heroAvatar(hero)) +
          '" alt=""/><span><small>' +
          (enemy ? "ПРОТИВНИК" : "СОЮЗНИК") +
          " " +
          (index + 1) +
          '</small><select ' +
          (enemy ? 'data-draft-enemy="' : 'data-draft-ally="') +
          index +
          '">' +
          self.heroSelectOptions(name) +
          "</select></span></label>";
      })
      .join("");
  };

  TrainingSuite.prototype.renderDraftDetail = function (ranked) {
    var result = this.draftState.result;
    if (!result) {
      if (this.draftState.mode === "learn") {
        var best = ranked[0];
        return '<section class="draft-teacher"><span>ТРЕНЕР ПОКАЗЫВАЕТ ХОД МЫСЛИ</span><strong>Начни с ' +
          escapeHtml(best.tank.name) +
          "</strong><p>Сначала прочитай карту, затем союзные кнопки и только потом угрозы врага. Нажми любого танка, чтобы увидеть расчёт.</p></section>";
      }
      return '<section class="draft-teacher draft-teacher--exam"><span>ЭКЗАМЕН</span><strong>Оценки скрыты</strong><p>Выбери танка. После ответа откроются место в рейтинге и причины.</p></section>';
    }
    var entry = result.entry;
    var tank = entry.tank;
    var state = this.draftState;
    var allyPairs = state.allies
      .map(function (name) {
        return { name: name, pair: tank.pairs[name] };
      })
      .filter(function (item) { return item.pair; })
      .sort(function (a, b) { return b.pair.synergy - a.pair.synergy; });
    var enemyPairs = state.enemies
      .map(function (name) {
        return { name: name, pair: tank.pairs[name] };
      })
      .filter(function (item) { return item.pair; })
      .sort(function (a, b) { return b.pair.counter - a.pair.counter; });
    var explanations = [];
    if (allyPairs[0]) explanations.push("Союзник: " + allyPairs[0].pair.synergyNote);
    if (enemyPairs[0]) explanations.push("Матчап: " + enemyPairs[0].pair.counterNote);
    if (!explanations.length) explanations.push("На first pick решают карта, ширина пула и надёжность общего плана.");
    return '<section class="draft-breakdown ' +
      (result.rank <= 3 ? "is-good" : "is-warning") +
      '"><header><div><span>РАЗБОР ПИКА</span><strong>' +
      escapeHtml(tank.name) +
      " · место " +
      result.rank +
      " / 13</strong></div><b>" +
      entry.score.total +
      '<small>/ 100</small></b></header><div class="draft-breakdown__metrics"><span><small>КАРТА</small><strong>' +
      (entry.score.map >= 0 ? "+" : "") +
      entry.score.map +
      "</strong></span><span><small>СИНЕРГИЯ</small><strong>" +
      entry.score.synergy.toFixed(1) +
      "</strong></span><span><small>КОНТРПИК</small><strong>" +
      entry.score.counter.toFixed(1) +
      '</strong></span></div><div class="draft-breakdown__notes">' +
      explanations.map(function (note) { return "<p>" + escapeHtml(note) + "</p>"; }).join("") +
      "</div>" +
      (result.rank > 3
        ? '<footer>Лучший ответ модели: <strong>' + escapeHtml(result.bestEntry.tank.name) + "</strong> · " + result.bestEntry.score.total + " / 100</footer>"
        : '<footer>Рабочий выбор. Сравни объяснение с собственным пулом и планом команды.</footer>') +
      "</section>";
  };

  TrainingSuite.prototype.renderDraft = function () {
    var state = this.draftState;
    var phase = PHASES[state.phase];
    var ranked = this.rankedTanks();
    var scoreByTank = new Map(
      ranked.map(function (entry) {
        return [entry.tank.id, entry.score];
      }),
    );
    var mapOptions = this.data.maps
      .map(function (map) {
        return '<option value="' + escapeHtml(map.name) + '"' + (map.name === state.mapName ? " selected" : "") + ">" + escapeHtml(map.name) + "</option>";
      })
      .join("");
    var self = this;
    var tankCards = this.data.draft.tanks
      .map(function (tank) {
        var score = scoreByTank.get(tank.id);
        var selected = state.selectedTank === tank.id;
        var showScore = state.mode === "learn" || Boolean(state.result);
        var avatar = heroAvatar(self.heroByName.get(tank.name));
        return '<button type="button" class="draft-tank-card ' +
          (selected ? "is-selected " : "") +
          (showScore && score.total >= 75 ? "is-recommended" : "") +
          '" data-draft-tank="' +
          tank.id +
          '"><img src="' +
          avatar +
          '" alt=""/><span><strong>' +
          escapeHtml(tank.name) +
          "</strong><small>" +
          (showScore ? "MODEL · " + score.total : "ВЫБРАТЬ") +
          "</small></span>" +
          (showScore ? '<b style="--score:' + score.total + '%">' + score.total + "</b>" : "<i>?</i>") +
          "</button>";
      })
      .join("");

    this.draftPanel.innerHTML = [
      '<header class="suite-panel__header"><div><span>06 / TANK DRAFT</span><h3>Пик с объяснением</h3><p>Карта + свои герои + угрозы врага. Не тир-лист: модель показывает вклад каждого слоя.</p></div>',
      '<div class="suite-mode" role="group" aria-label="Режим драфта"><button type="button" data-draft-mode="learn" class="' +
        (state.mode === "learn" ? "is-active" : "") +
        '">Обучение</button><button type="button" data-draft-mode="exam" class="' +
        (state.mode === "exam" ? "is-active" : "") +
        '">Экзамен</button></div></header>',
      '<div class="draft-setup"><label><span>Карта</span><select data-draft-map>' +
        mapOptions +
        '</select></label><div class="draft-phase-tabs"><button type="button" data-draft-phase="fp" class="' +
        (state.phase === "fp" ? "is-active" : "") +
        '">FP</button><button type="button" data-draft-phase="mid" class="' +
        (state.phase === "mid" ? "is-active" : "") +
        '">MID</button><button type="button" data-draft-phase="last" class="' +
        (state.phase === "last" ? "is-active" : "") +
        '">LAST</button></div><button type="button" data-draft-new>Новая ситуация</button></div>',
      '<div class="draft-phase-brief"><span>' +
        escapeHtml(phase.title) +
        "</span><p>" +
        escapeHtml(phase.description) +
        "</p></div>",
      '<div class="draft-teams"><section><header><span>ВАША КОМАНДА</span><b>' +
        state.allies.length +
        ' / 4</b></header><div>' +
        this.draftSlotsMarkup(state.allies, false) +
        '</div></section><section class="draft-team--enemy"><header><span>ПРОТИВНИК</span><b>' +
        state.enemies.length +
        ' / 4</b></header><div>' +
        this.draftSlotsMarkup(state.enemies, true) +
        "</div></section></div>",
      '<div class="draft-choice-head"><div><span>ТВОЙ ВЫБОР</span><strong>13 танков гайда</strong></div><p>' +
        (state.mode === "learn" ? "Число — итог учебной модели." : state.result ? "Оценки открыты после ответа." : "Оценки скрыты до ответа.") +
        "</p></div>",
      '<div class="draft-tank-grid">' + tankCards + "</div>",
      this.renderDraftDetail(ranked),
      '<footer class="draft-method"><span>90 героев · 1170 пар</span><p>Матрица учитывает свойства способностей, синергию, контрплан и профиль карты. Владение героем и конкретный билд остаются важнее небольшой разницы в баллах.</p><em>Локальный каталог 97.0.39</em></footer>',
    ].join("");
  };

  function mount(data) {
    repairThreatRange();
    var tactics = document.querySelector(".lab-page #tactics-lab-panel");
    if (document.querySelector(".training-expansion")) return true;
    if (!tactics) return false;
    var expansion = document.createElement("section");
    expansion.className = "training-expansion";
    tactics.insertAdjacentElement("afterend", expansion);
    new TrainingSuite(expansion, data);
    return true;
  }

  function start() {
    if (!document.querySelector(".lab-page")) return;
    fetch(BASE + "/lab/training-data.json")
      .then(function (response) {
        if (!response.ok) throw new Error("Training data returned " + response.status);
        return response.json();
      })
      .then(function (data) {
        var attempts = 0;
        function tryMount() {
          attempts += 1;
          if (!mount(data) && attempts < 20) window.setTimeout(tryMount, 100);
        }
        requestAnimationFrame(tryMount);
      })
      .catch(function (error) {
        console.error("Tank training suite:", error);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
