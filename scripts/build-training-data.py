from __future__ import annotations

import importlib.util
import json
import math
import shutil
import sys
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]
WORKSPACE = REPO.parent
OUTPUT = REPO / "overrides" / "data" / "tank-training-data.json"
MAP_ASSETS = REPO / "overrides" / "assets" / "training-maps"
DRAFT_ASSETS = REPO / "overrides" / "assets" / "draft-portraits"
CATALOG = WORKSPACE / "HotsGuideWordAddIn" / "Data" / "hots_catalog_ru.json"
MAP_DATA = WORKSPACE / "MapAnnotator" / "data" / "maps"
MAP_INDEX = WORKSPACE / "hots_custom_minimaps_ru" / "index.json"
MACRO_DATA = WORKSPACE / "hots_map_control_macro_ru" / "data" / "map_control_macro_data.json"
DRAFT_MODEL = WORKSPACE / "add_draft_matrices_section.py"

GUIDE_TANKS = [
    "Ануб'арак",
    "Артас",
    "Блэйз",
    "Диабло",
    "E.T.C.",
    "Гаррош",
    "Джоанна",
    "Мал'Ганис",
    "Мэй",
    "Мурадин",
    "Стежок",
    "Тираэль",
    "Вариан",
]

TANK_SLUGS = {
    "Ануб'арак": "anubarak",
    "Артас": "arthas",
    "Блэйз": "blaze",
    "Диабло": "diablo",
    "E.T.C.": "etc",
    "Гаррош": "garrosh",
    "Джоанна": "johanna",
    "Мал'Ганис": "malganis",
    "Мэй": "mei",
    "Мурадин": "muradin",
    "Стежок": "stitches",
    "Тираэль": "tyrael",
    "Вариан": "varian",
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def import_draft_model():
    spec = importlib.util.spec_from_file_location("tank_draft_model", DRAFT_MODEL)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load draft model: {DRAFT_MODEL}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def farthest_sample(points: list[list[float]], maximum: int) -> list[list[float]]:
    if len(points) <= maximum:
        return points
    chosen = [points[0]]
    remaining = points[1:]
    while remaining and len(chosen) < maximum:
        index = max(
            range(len(remaining)),
            key=lambda i: min(
                math.dist(remaining[i], candidate) for candidate in chosen
            ),
        )
        chosen.append(remaining.pop(index))
    return chosen


MAP_PIXEL_SHIFTS = {
    "alterac_pass": (0, -15),
    "braxis_holdout": (0, -20),
    "blackhearts_bay": (10, -16),
    "battlefield_of_eternity": (0, -12),
    "dragon_shire": (0, -18),
    "volskaya_foundry": (0, -24),
    "sky_temple": (0, -16),
    "infernal_shrines": (4, -4),
    "hanamura_temple": (0, -12),
    "garden_of_terror": (12, 0),
    "cursed_hollow": (-12, 0),
}


def normalized(
    pos: list[float], dimensions: list[int], map_id: str, image_size: list[int]
) -> dict[str, float]:
    """Mirror MapAnnotator CanvasManager.gameToPixelCoords exactly."""
    width, height = dimensions
    image_width, image_height = image_size
    x, y = float(pos[0]), float(pos[1])
    if map_id == "towers_of_doom":
        pixel_x = 2.286 * x - 27.5
        pixel_y = 395.0 - 1.92 * y
    elif map_id == "tomb_of_the_spider_queen":
        pixel_x = 2.0 * x
        pixel_y = 409.0 - 1.93 * y
    else:
        pixel_x = x * image_width / width
        pixel_y = (height - y) * image_height / height
        if map_id == "cursed_hollow":
            pixel_y -= 10
    shift_x, shift_y = MAP_PIXEL_SHIFTS.get(map_id, (0, 0))
    return {
        "x": round((pixel_x / image_width + shift_x / 1024) * 100, 3),
        "y": round((pixel_y / image_height + shift_y / 1024) * 100, 3),
    }


def build_maps() -> list[dict]:
    minimap_by_name = {item["name"]: item for item in load_json(MAP_INDEX)}
    macro_root = load_json(MACRO_DATA)
    macro_by_name = macro_root["maps"]
    maps = []
    MAP_ASSETS.mkdir(parents=True, exist_ok=True)

    for source in sorted(MAP_DATA.glob("*.json")):
        if source.name == "index.json":
            continue
        data = load_json(source)
        name = data["name_ru"]
        minimap = minimap_by_name[name]["exported"][0]["png_file"]
        image_size = minimap_by_name[name]["exported"][0]["size"]
        minimap_source = WORKSPACE / minimap
        minimap_target = MAP_ASSETS / f"{data['id']}.png"
        shutil.copy2(minimap_source, minimap_target)
        dimensions = data["terrain_dims"]
        layers = data["layers"]
        bush_positions = [item["pos"] for item in layers.get("bushes", [])]
        lane_centers = [
            lane["center"] for lane in layers.get("lanes", {}).values()
        ]
        camps = layers.get("camps", [])

        def camp_type(item: dict) -> str:
            return item.get("info", {}).get("type", "")

        regular_camps = [
            item
            for item in camps
            if "boss" not in camp_type(item).lower()
            and "turret" not in camp_type(item).lower()
            and "vision" not in camp_type(item).lower()
            and "recon" not in camp_type(item).lower()
        ]
        bosses = [item for item in camps if "boss" in camp_type(item).lower()]
        turrets = [item for item in camps if "turret" in camp_type(item).lower()]
        vision_points = [
            *layers.get("watchtowers", []),
            *[
                item
                for item in camps
                if "vision" in camp_type(item).lower()
                or "recon" in camp_type(item).lower()
            ],
        ]
        macro = macro_by_name[name]
        maps.append(
            {
                "id": data["id"],
                "name": name,
                "image": f"/hots_tank.github.io/lab/game-assets/training-maps/{data['id']}.png",
                "dimensions": dimensions,
                "imageSize": image_size,
                "meta": data.get("meta", {}),
                "macro": {
                    key: macro[key]
                    for key in (
                        "objective",
                        "macro",
                        "solo",
                        "main",
                        "safe",
                        "camp_rule",
                        "object_rule",
                        "special",
                        "early",
                    )
                },
                "markers": {
                    "camp": [
                        {
                            **normalized(item["pos"], dimensions, data["id"], image_size),
                            "label": item.get("info", {}).get("type", "Кемп"),
                            "timing": " · ".join(
                                value
                                for value in (
                                    item.get("info", {}).get("start"),
                                    item.get("info", {}).get("respawn"),
                                )
                                if value
                            ),
                        }
                        for item in regular_camps
                    ],
                    "objective": [
                        {
                            **normalized(item["pos"], dimensions, data["id"], image_size),
                            "label": item.get("name")
                            or item.get("kind", "Объект"),
                        }
                        for item in layers.get("objectives", [])
                    ],
                    "bush": [
                        {
                            **normalized(pos, dimensions, data["id"], image_size),
                            "label": "Куст / туман",
                        }
                        for pos in bush_positions
                    ],
                    "boss": [
                        {
                            **normalized(item["pos"], dimensions, data["id"], image_size),
                            "label": camp_type(item) or "Босс",
                        }
                        for item in bosses
                    ],
                    "turret": [
                        {
                            **normalized(item["pos"], dimensions, data["id"], image_size),
                            "label": camp_type(item) or "Турель",
                        }
                        for item in turrets
                    ],
                    "vision": [
                        {
                            **normalized(item["pos"], dimensions, data["id"], image_size),
                            "label": camp_type(item)
                            or item.get("name")
                            or "Точка обзора",
                        }
                        for item in vision_points
                    ],
                    "lane": [
                        {
                            **normalized(pos, dimensions, data["id"], image_size),
                            "label": f"Линия {index + 1}",
                        }
                        for index, pos in enumerate(lane_centers)
                    ],
                },
                "scenarios": [
                    {
                        "id": "objective_30",
                        "title": f"{macro['objective'].capitalize()} через 30 секунд",
                        "situation": (
                            "Уровни равны, все герои видны. Команда только что зачистила "
                            f"{macro['main']}-линию. Составь первые три команды танка."
                        ),
                        "expected": ["bush", "objective", "hold"],
                        "answer": macro["object_rule"],
                    },
                    {
                        "id": "camp_window",
                        "title": "До объекта 55 секунд, линия отпушена",
                        "situation": (
                            "У команды есть короткое окно темпа. Отметь безопасную "
                            "последовательность: где создать давление и откуда выйти к объекту."
                        ),
                        "expected": ["camp", "lane", "bush"],
                        "answer": macro["camp_rule"],
                    },
                    {
                        "id": "down_player",
                        "title": "Объект через 20 секунд, союзник мёртв",
                        "situation": (
                            "Вы временно 4v5. Не отдавай лишние смерти: отметь безопасную "
                            "точку, линию опыта и путь отхода."
                        ),
                        "expected": ["lane", "hold", "retreat"],
                        "answer": macro["special"],
                    },
                ],
            }
        )
    return maps


def build_draft() -> dict:
    model = import_draft_model()
    heroes = model.load_catalog()
    cache = model.ASSET_DIR / "icy_master_tier_cache.json"
    if cache.exists():
        model.apply_tier_data(heroes, load_json(cache))
    by_name = {hero.name: hero for hero in heroes}
    catalog = load_json(CATALOG)
    catalog_by_name = {hero["name"]: hero for hero in catalog["heroes"]}
    DRAFT_ASSETS.mkdir(parents=True, exist_ok=True)

    hero_rows = []
    for hero in heroes:
        catalog_hero = catalog_by_name[hero.name]
        portrait_source = WORKSPACE / catalog_hero["portraits"]["draftScreen"]
        portrait_target = DRAFT_ASSETS / f"{catalog_hero['id'].lower()}.png"
        shutil.copy2(portrait_source, portrait_target)
        hero_rows.append(
            {
                "id": catalog_hero["id"],
                "name": hero.name,
                "role": hero.role,
                "tier": hero.tier,
                "demand": hero.demand,
                "avatar": (
                    "/hots_tank.github.io/lab/game-assets/draft-portraits/"
                    + catalog_hero["id"].lower()
                    + ".png"
                ),
            }
        )

    tank_rows = []
    for tank_name in GUIDE_TANKS:
        tank = by_name[tank_name]
        profile = model.TANK_PROFILES[tank_name]
        pairs = {}
        for hero in heroes:
            counter = model.score_counter(tank, hero)
            synergy = model.score_synergy(tank, hero)
            pairs[hero.name] = {
                "counter": counter.score,
                "counterMark": counter.mark,
                "counterNote": counter.note,
                "synergy": synergy.score,
                "synergyMark": synergy.mark,
                "synergyNote": synergy.note,
            }
        tank_rows.append(
            {
                "id": TANK_SLUGS[tank_name],
                "name": tank_name,
                "tier": tank.tier,
                "demand": tank.demand,
                "goodMaps": profile["good_maps"],
                "badMaps": profile["bad_maps"],
                "pairs": pairs,
            }
        )
    return {"heroes": hero_rows, "tanks": tank_rows}


def main() -> None:
    payload = {
        "meta": {
            "patch": "2.55.16.97039",
            "generatedFrom": [
                "local HotS catalog 97039",
                "local annotated MapAnnotator coordinates",
                "local deterministic tank draft matrix",
            ],
            "notice": (
                "Учебная модель: оценки объясняют совместимость, но не являются "
                "онлайн-прогнозом победы."
            ),
        },
        "maps": build_maps(),
        "draft": build_draft(),
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(
        f"Built {OUTPUT}: {len(payload['maps'])} maps, "
        f"{len(payload['draft']['tanks'])} tanks, "
        f"{len(payload['draft']['heroes'])} heroes."
    )


if __name__ == "__main__":
    main()
