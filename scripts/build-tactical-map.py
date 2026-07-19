from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import io
import json
import re
import shutil
import struct
import sys
from collections import Counter, defaultdict
from pathlib import Path

import mpyq
import numpy as np
from lxml import etree
from PIL import Image


REPO = Path(__file__).resolve().parents[1]
DEFAULT_MAP = REPO.parent / "hots_release_stormmaps" / "Cursed.Hollow.stormmap"
DEFAULT_M3_ROOT = REPO.parent / "extracted_hots_m3_cursed"
DEFAULT_M3_ADDON = REPO.parent / "tools" / "m3addon"
DEFAULT_TERRAIN_TEXTURE_ROOT = REPO.parent / "extracted_hots_terrain_cursed"
DEFAULT_CATALOG_XML = REPO.parent / "raw_hots_xml_97039" / "xmlgamedata.xml"
DEFAULT_NATIVE_ASSET_ROOT = (
    REPO.parent
    / "extracted_hots_cursed_full"
    / "mods"
    / "heroes.stormmod"
    / "base.stormassets"
)
DEFAULT_OUTPUT = REPO / "overrides" / "assets" / "tactical-map" / "cursed-hollow"

MODEL_FILES = {
    "core": "Storm_Building_KingsCrest_Core_Dragon.m3",
    "tower-l2": "Storm_Building_KingsCrest_Tower_01.m3",
    "tower-l3": "Storm_Building_KingsCrest_Tower_02.m3",
    "fort": "Storm_Building_KingsCrest_CastleUpgrade.m3",
    "keep": "Storm_Building_KingsCrest_CastleSuperior.m3",
    "fountain": "Storm_Building_KingsCrest_ManaWell.m3",
    "watchtower": "Storm_Building_KingsCrest_WatchTower.m3",
    "gate": "Storm_Building_KingsCrest_Gate.m3",
    "wall": "Storm_Doodad_KingsCrest_Fence_Stone.m3",
    "bush": "Storm_Doodad_KingsCrest_RavenBush_00.m3",
    "house": "Storm_Doodad_KingsCrest_RavenCourt_House_00.m3",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build the standalone Cursed Hollow tactical-map dataset."
    )
    parser.add_argument("--stormmap", type=Path, default=DEFAULT_MAP)
    parser.add_argument("--m3-root", type=Path, default=DEFAULT_M3_ROOT)
    parser.add_argument("--m3-addon", type=Path, default=DEFAULT_M3_ADDON)
    parser.add_argument("--terrain-texture-root", type=Path, default=DEFAULT_TERRAIN_TEXTURE_ROOT)
    parser.add_argument("--catalog-xml", type=Path, default=DEFAULT_CATALOG_XML)
    parser.add_argument("--native-asset-root", type=Path, default=DEFAULT_NATIVE_ASSET_ROOT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def parse_map_info(contents: bytes) -> dict:
    cursor = 0

    def read_u32() -> int:
        nonlocal cursor
        value = struct.unpack_from("<I", contents, cursor)[0]
        cursor += 4
        return value

    def read_cstring() -> str:
        nonlocal cursor
        end = contents.index(b"\0", cursor)
        value = contents[cursor:end].decode("utf-8", errors="replace")
        cursor = end + 1
        return value

    magic = contents[:4]
    cursor = 4
    if magic not in {b"IpaM", b"MapI"}:
        raise RuntimeError(f"Unsupported MapInfo magic: {magic!r}")
    version = read_u32()
    if version >= 0x18:
        read_u32()
        read_u32()
    width = read_u32()
    height = read_u32()
    small_preview_type = read_u32()
    if small_preview_type == 2:
        read_cstring()
    large_preview_type = read_u32()
    if large_preview_type == 2:
        read_cstring()
    if version >= 0x1F:
        read_cstring()
    if version >= 0x26:
        read_cstring()
    if version >= 0x1F:
        read_u32()
    read_u32()
    fog_type = read_cstring()
    tile_set = read_cstring()
    playable = [read_u32(), read_u32(), read_u32(), read_u32()]
    base_height = read_u32() / 4096
    return {
        "version": version,
        "width": width,
        "height": height,
        "playableBounds": playable,
        "baseHeight": base_height,
        "fogType": fog_type,
        "tileSet": tile_set,
    }


def position(value: str | None) -> list[float]:
    values = [float(item) for item in (value or "0,0,0").split(",")]
    return (values + [0.0, 0.0, 0.0])[:3]


def scale(value: str | None) -> list[float]:
    values = [float(item) for item in (value or "1,1,1").split(",")]
    return (values + [1.0, 1.0, 1.0])[:3]


def unit_mesh(unit_type: str) -> str | None:
    if unit_type == "KingsCore":
        return "core"
    if unit_type in {"TownCannonTowerL2"}:
        return "tower-l2"
    if unit_type.startswith("TownCannonTowerL3"):
        return "tower-l3"
    if unit_type == "TownTownHallL2":
        return "fort"
    if unit_type == "TownTownHallL3":
        return "keep"
    if unit_type.startswith("TownMoonwell"):
        return "fountain"
    if unit_type == "XelNagaWatchTower":
        return "watchtower"
    if unit_type.startswith("TownGate"):
        return "gate"
    if unit_type.startswith("TownWall"):
        return "wall"
    return None


def unit_category(unit_type: str) -> str:
    if unit_type == "KingsCore":
        return "core"
    if "CannonTower" in unit_type:
        return "tower"
    if "TownHallL2" in unit_type:
        return "fort"
    if "TownHallL3" in unit_type:
        return "keep"
    if "Moonwell" in unit_type:
        return "fountain"
    if "WatchTower" in unit_type:
        return "vision"
    if "Gate" in unit_type:
        return "gate"
    if "Wall" in unit_type:
        return "wall"
    return "detail"


def point_category(point: etree._Element) -> str:
    name = (point.get("Name") or "").lower()
    point_type = point.get("Type") or "Normal"
    if point_type == "StartLoc":
        return "spawn"
    if "tear" in name or "tribute" in name:
        return "objective"
    if "merc camp" in name or "grave golem" in name:
        return "camp"
    if "lane" in name or "waypoint" in name:
        return "lane"
    if "watch" in name or "vision" in name:
        return "vision"
    return "detail"


class CatalogResolver:
    def __init__(self, catalog_path: Path, native_asset_root: Path):
        root = etree.parse(str(catalog_path)).getroot()
        self.actors: dict[str, list[etree._Element]] = defaultdict(list)
        self.models: dict[str, list[etree._Element]] = defaultdict(list)
        self.units: dict[str, list[etree._Element]] = defaultdict(list)
        self.footprints: dict[str, list[etree._Element]] = defaultdict(list)
        self.unit_actors: dict[str, list[str]] = defaultdict(list)
        for entry in root:
            entry_id = entry.get("id")
            if entry_id and entry.tag.startswith("CActor"):
                self.actors[entry_id].append(entry)
                unit_name = entry.get("unitName")
                if unit_name:
                    self.unit_actors[unit_name].append(entry_id)
            if entry_id and entry.tag.startswith("CModel"):
                self.models[entry_id].append(entry)
            if entry_id and entry.tag == "CUnit":
                self.units[entry_id].append(entry)
            if entry_id and entry.tag == "CFootprint":
                self.footprints[entry_id].append(entry)
        self.native_asset_root = native_asset_root
        self.native_models = {
            str(path.relative_to(native_asset_root)).replace("/", "\\").lower(): path
            for path in native_asset_root.rglob("*.m3")
        } if native_asset_root.is_dir() else {}

    def field(
        self,
        catalog: dict[str, list[etree._Element]],
        entry_id: str | None,
        child_name: str,
        seen: set[str] | None = None,
    ) -> str | None:
        if not entry_id:
            return None
        seen = set() if seen is None else seen
        if entry_id in seen:
            return None
        seen.add(entry_id)
        records = catalog.get(entry_id, [])
        for record in reversed(records):
            for child in reversed(record.findall(child_name)):
                if child.get("value") is not None:
                    return child.get("value")
        parent = next(
            (record.get("parent") for record in reversed(records) if record.get("parent") is not None),
            None,
        )
        return self.field(catalog, parent, child_name, seen)

    def resolve(self, object_tag: str, object_type: str, variation: int) -> dict:
        if object_tag == "ObjectDoodad":
            actor_id = object_type
        else:
            actor_ids = self.unit_actors.get(object_type)
            actor_id = actor_ids[-1] if actor_ids else object_type
        footprint_id = (
            self.field(self.actors, actor_id, "Footprint")
            if object_tag == "ObjectDoodad"
            else self.field(self.units, object_type, "Footprint")
        )
        radius_value = (
            self.field(self.units, object_type, "Radius")
            if object_tag == "ObjectUnit"
            else None
        )
        collision = {
            "footprint": footprint_id or None,
            "radius": float(radius_value) if radius_value else 0.0,
        }
        model_id = self.field(self.actors, actor_id, "Model") or actor_id
        model_id = model_id.replace("##id##", actor_id).replace("##unitName##", object_type)
        model_path = self.field(self.models, model_id, "Model")
        if model_path:
            model_path = model_path.replace("##id##", model_id).replace("##unitName##", object_type)
        elif object_tag == "ObjectDoodad":
            model_path = f"Assets\\Doodads\\{model_id}\\{model_id}.m3"
        else:
            return {"actor": actor_id, "model": model_id, "path": None, "asset": None, **collision}

        model_path = model_path.replace("/", "\\")
        path = Path(model_path)
        variant = str(path.with_name(f"{path.stem}_{variation:02d}{path.suffix}"))
        selected = variant if variant.lower() in self.native_models else model_path
        if selected.lower() not in self.native_models:
            selected = None
        return {
            "actor": actor_id,
            "model": model_id,
            "path": model_path,
            "asset": selected.replace("\\", "/") if selected else None,
            **collision,
        }

    def footprint_definition(self, footprint_id: str | None, seen: set[str] | None = None) -> dict | None:
        if not footprint_id:
            return None
        seen = set() if seen is None else seen
        if footprint_id in seen:
            return None
        seen.add(footprint_id)
        records = self.footprints.get(footprint_id, [])
        for record in reversed(records):
            layer = next(
                (node for node in record.findall("Layers") if node.get("index") == "Check" and node.findall("Rows")),
                None,
            )
            if layer is not None:
                rows = [node.get("value") or "" for node in layer.findall("Rows")]
                area = layer.get("Area")
                if area:
                    bounds = [float(value) for value in area.split(",")]
                else:
                    width, height = len(rows[0]), len(rows)
                    bounds = [-width / 2, -height / 2, width / 2, height / 2]
                return {"id": footprint_id, "rows": rows, "bounds": bounds}
        parent = next(
            (record.get("parent") for record in reversed(records) if record.get("parent") is not None),
            None,
        )
        return self.footprint_definition(parent, seen)


def extract_scene(
    objects_xml: bytes,
    regions_xml: bytes,
    playable_bounds: list[int],
    catalog: CatalogResolver,
) -> dict:
    placed = etree.fromstring(objects_xml)
    units: list[dict] = []
    doodads: list[dict] = []
    points: list[dict] = []

    raw_counts = Counter(item.tag for item in placed)
    left, bottom, right, top = playable_bounds

    def inside(item: etree._Element) -> bool:
        x, y, _ = position(item.get("Position"))
        return left <= x <= right and bottom <= y <= top

    for item in placed:
        if item.tag in {"ObjectUnit", "ObjectDoodad", "ObjectPoint"} and not inside(item):
            continue
        if item.tag == "ObjectUnit":
            unit_type = item.get("UnitType") or "Unknown"
            variation = int(item.get("Variation") or 0)
            native = catalog.resolve(item.tag, unit_type, variation)
            category = unit_category(unit_type)
            if category == "detail" and "PathingBlocker" in unit_type:
                continue
            player = int(item.get("Player") or 0)
            units.append(
                {
                    "id": item.get("Id"),
                    "type": unit_type,
                    "name": item.get("Name") or unit_type,
                    "position": position(item.get("Position")),
                    "rotation": float(item.get("Rotation") or 0),
                    "scale": scale(item.get("Scale")),
                    "team": "blue" if player == 11 else "red" if player == 12 else "neutral",
                    "category": category,
                    "mesh": unit_mesh(unit_type),
                    "variation": variation,
                    "native": native,
                }
            )
        elif item.tag == "ObjectDoodad":
            doodad_type = item.get("Type") or "Unknown"
            variation = int(item.get("Variation") or 0)
            native = catalog.resolve(item.tag, doodad_type, variation)
            mesh = None
            if "RavenBush" in doodad_type:
                mesh = "bush"
            elif doodad_type == "Storm_Doodad_KingsCrest_RavenCourt_House":
                mesh = "house"
            doodads.append(
                {
                    "id": item.get("Id"),
                    "type": doodad_type,
                    "position": position(item.get("Position")),
                    "rotation": float(item.get("Rotation") or 0),
                    "pitch": float(item.get("Pitch") or 0),
                    "roll": float(item.get("Roll") or 0),
                    "scale": scale(item.get("Scale")),
                    "variation": variation,
                    "mesh": mesh,
                    "category": "bush" if "Bush" in doodad_type else "environment",
                    "native": native,
                }
            )
        elif item.tag == "ObjectPoint":
            points.append(
                {
                    "id": item.get("Id"),
                    "name": item.get("Name") or item.get("Type") or "Point",
                    "type": item.get("Type") or "Normal",
                    "category": point_category(item),
                    "position": position(item.get("Position")),
                }
            )

    region_root = etree.fromstring(regions_xml)
    regions: list[dict] = []
    for region in region_root.findall("region"):
        name_node = region.find("name")
        shapes = []
        for shape in region.findall("shape"):
            child = next(iter(shape), None)
            if child is None or not child.get("value"):
                continue
            shapes.append(
                {
                    "type": shape.get("type") or child.tag,
                    "values": [float(value) for value in child.get("value").split(",")],
                }
            )
        regions.append(
            {
                "id": region.get("id"),
                "name": name_node.get("value") if name_node is not None else f"Region {region.get('id')}",
                "shapes": shapes,
            }
        )

    return {
        "units": units,
        "doodads": doodads,
        "points": points,
        "regions": regions,
        "counts": {
            "units": len(units),
            "doodads": len(doodads),
            "points": len(points),
            "regions": len(regions),
            "doodadTypes": len({item["type"] for item in doodads}),
            "sourceUnits": raw_counts["ObjectUnit"],
            "sourceDoodads": raw_counts["ObjectDoodad"],
            "culledOutsidePlayable": (
                raw_counts["ObjectUnit"] + raw_counts["ObjectDoodad"]
                - len(units) - len(doodads)
            ),
        },
        "doodadTypes": dict(Counter(item["type"] for item in doodads).most_common()),
    }


def extract_terrain(
    archive: mpyq.MPQArchive,
    output: Path,
    map_info: dict,
    scene: dict,
    catalog: CatalogResolver,
) -> dict:
    terrain = etree.fromstring(archive.read_file(b"t3Terrain.xml"))
    height_map = terrain.find("heightMap")
    if height_map is None:
        raise RuntimeError("t3Terrain.xml is missing heightMap")
    width, height = [int(value) for value in height_map.get("dim").split()]
    vert_data = height_map.find("vertData")
    bias = float(vert_data.get("quantizeBias"))
    quantize_scale = float(vert_data.get("quantizeScale"))
    standard_height = float(vert_data.get("standardHeight"))

    raw_height = archive.read_file(vert_data.get("name").encode("ascii"))
    expected_values = width * height * 3
    values = np.frombuffer(raw_height, dtype="<u2", offset=32, count=expected_values)
    height_fields = values.reshape(height, width, 3)
    base_heights = height_fields[:, :, 0].astype(np.float32)
    adjustments = height_fields[:, :, 1].astype(np.float32)
    terrain_offset = [float(value) for value in height_map.get("offset").split()]
    terrain_scale = [float(value) for value in height_map.get("scale").split()]
    heights = (
        (base_heights * quantize_scale - bias) * terrain_scale[2]
        + terrain_offset[2]
        + (adjustments * quantize_scale - bias)
    ).astype("<f4")

    cell_width = width - 1
    cell_height = height - 1
    pcl = np.frombuffer(
        archive.read_file(b"CellAttribute_Pcl"),
        dtype=np.uint8,
        offset=4,
        count=cell_width * cell_height,
    ).reshape(cell_height, cell_width)
    vbl = np.frombuffer(
        archive.read_file(b"CellAttribute_Vbl"),
        dtype=np.uint8,
        offset=4,
        count=cell_width * cell_height,
    ).reshape(cell_height, cell_width)
    pcl = pcl.copy()
    vbl = vbl.copy()
    left, bottom, right, top = map_info["playableBounds"]
    cell_x = np.arange(cell_width)[None, :] + 0.5
    cell_y = np.arange(cell_height)[:, None] + 0.5
    inside_playable = (
        (cell_x >= left) & (cell_x < right) & (cell_y >= bottom) & (cell_y < top)
    )
    pcl[~inside_playable] = 255
    vbl[~inside_playable] = 255
    footprint_cells: set[tuple[int, int]] = set()
    footprint_instances = 0
    for item in (*scene["units"], *scene["doodads"]):
        footprint = catalog.footprint_definition(item.get("native", {}).get("footprint"))
        if not footprint or not any("x" in row.lower() for row in footprint["rows"]):
            continue
        rows = footprint["rows"]
        x0, y0, x1, y1 = footprint["bounds"]
        px, py, _ = item["position"]
        angle = float(item.get("rotation") or 0)
        cosine, sine = np.cos(angle), np.sin(angle)
        corners = [(x0, y0), (x0, y1), (x1, y0), (x1, y1)]
        world_corners = [
            (px + cosine * x - sine * y, py + sine * x + cosine * y)
            for x, y in corners
        ]
        min_x = max(0, int(np.floor(min(value[0] for value in world_corners))))
        max_x = min(cell_width - 1, int(np.ceil(max(value[0] for value in world_corners))))
        min_y = max(0, int(np.floor(min(value[1] for value in world_corners))))
        max_y = min(cell_height - 1, int(np.ceil(max(value[1] for value in world_corners))))
        placed = False
        for cell_y_index in range(min_y, max_y + 1):
            for cell_x_index in range(min_x, max_x + 1):
                dx = cell_x_index + 0.5 - px
                dy = cell_y_index + 0.5 - py
                local_x = cosine * dx + sine * dy
                local_y = -sine * dx + cosine * dy
                column = int(np.floor(local_x - x0))
                row_from_bottom = int(np.floor(local_y - y0))
                row = len(rows) - 1 - row_from_bottom
                if row < 0 or row >= len(rows) or column < 0 or column >= len(rows[row]):
                    continue
                if rows[row][column].lower() == "x":
                    pcl[cell_y_index, cell_x_index] = 255
                    footprint_cells.add((cell_x_index, cell_y_index))
                    placed = True
        if placed:
            footprint_instances += 1
    walkable = (pcl < 128) & inside_playable

    try:
        from scipy.ndimage import distance_transform_edt

        clearance = np.clip(np.rint(distance_transform_edt(walkable) * 10), 0, 255).astype(np.uint8)
    except ImportError:
        clearance = walkable.astype(np.uint8) * 10

    binary_path = output / "terrain.bin"
    with binary_path.open("wb") as stream:
        stream.write(b"TANKMAP2")
        stream.write(struct.pack("<HHf", width, height, float(heights.mean())))
        stream.write(heights.tobytes())
        stream.write(pcl.tobytes())
        stream.write(vbl.tobytes())
        stream.write(clearance.tobytes())

    return {
        "width": width,
        "height": height,
        "cellWidth": cell_width,
        "cellHeight": cell_height,
        "heightBias": bias,
        "heightScale": quantize_scale,
        "standardHeight": standard_height,
        "averageHeight": float(heights.mean()),
        "heightRange": [float(heights.min()), float(heights.max())],
        "offset": terrain_offset,
        "scale": terrain_scale,
        "walkableCells": int(walkable.sum()),
        "blockedCells": int((~walkable).sum()),
        "footprintInstances": footprint_instances,
        "footprintBlockedCells": len(footprint_cells),
        "binary": "terrain.bin",
        "binaryLayout": "TANKMAP2 + u16 width/height + f32 averageHeight + f32 world heights + u8 pcl/vbl/clearance",
        "playableBounds": map_info["playableBounds"],
    }


def locate_models(root: Path) -> dict[str, Path]:
    if not root.is_dir():
        return {}
    files = {path.name.lower(): path for path in root.rglob("*.m3")}
    return {
        alias: files[file_name.lower()]
        for alias, file_name in MODEL_FILES.items()
        if file_name.lower() in files
    }


def write_m3_mesh(m3_module, source: Path, target: Path) -> dict:
    model = m3_module.loadModel(str(source))
    vertex_name = "VertexFormat" + hex(model.vFlags)
    description = m3_module.structures[vertex_name].getVersion(0)
    count = len(model.vertices) // description.size
    vertices = description.createInstances(buffer=model.vertices, count=count)

    vertex_data = np.empty((count, 6), dtype="<f4")
    for index, vertex in enumerate(vertices):
        vertex_data[index] = (
            vertex.position.x,
            vertex.position.y,
            vertex.position.z,
            vertex.normal.x,
            vertex.normal.y,
            vertex.normal.z,
        )

    indices: list[int] = []
    for division in model.divisions:
        faces = division.faces
        for obj in division.objects:
            region = division.regions[obj.regionIndex]
            start = region.firstFaceVertexIndexIndex
            stop = start + region.numberOfFaceVertexIndices
            base = region.firstVertexIndex
            legacy = region.structureDescription.structureVersion <= 2
            for cursor in range(start, stop, 3):
                tri = [base + int(faces[cursor + offset]) for offset in range(3)]
                if legacy:
                    tri = [value - base for value in tri]
                if min(tri) < 0 or max(tri) >= count or len(set(tri)) < 3:
                    continue
                indices.extend(tri)

    index_data = np.asarray(indices, dtype="<u4")
    mins = vertex_data[:, :3].min(axis=0)
    maxs = vertex_data[:, :3].max(axis=0)
    with target.open("wb") as stream:
        stream.write(b"TGM1")
        stream.write(struct.pack("<II6f", count, len(indices), *mins, *maxs))
        stream.write(vertex_data.tobytes())
        stream.write(index_data.tobytes())

    return {
        "file": target.name,
        "vertices": count,
        "triangles": len(indices) // 3,
        "bounds": [float(value) for value in (*mins, *maxs)],
        "source": source.name,
    }


def extract_models(m3_root: Path, m3_addon: Path, output: Path) -> dict:
    available = locate_models(m3_root)
    mesh_output = output / "meshes"
    mesh_output.mkdir(parents=True, exist_ok=True)
    if not available:
        return {}
    sys.path.insert(0, str(m3_addon))
    import m3  # type: ignore

    meshes = {}
    for alias, source in available.items():
        target = mesh_output / f"{alias}.tgm"
        print(f"Converting {alias}: {source.name}")
        meshes[alias] = write_m3_mesh(m3, source, target)
    return meshes


def asset_key(path: str) -> str:
    return path.replace("\\", "/").lstrip("/").lower()


def packed_name(path: str, suffix: str) -> str:
    stem = re.sub(r"[^a-z0-9]+", "-", Path(path).stem.lower()).strip("-")[:48]
    digest = hashlib.sha1(asset_key(path).encode("utf-8")).hexdigest()[:12]
    return f"{stem}-{digest}{suffix}"


def material_layer(material, name: str) -> dict | None:
    layers = getattr(material, name, [])
    if not layers:
        return None
    layer = layers[0]
    image_path = getattr(layer, "imagePath", None)
    if not image_path:
        return None
    uv_source = int(getattr(layer, "uvSource", 0))
    return {
        "texture": asset_key(image_path),
        "channel": int(getattr(layer, "colorChannelSetting", 1)),
        "uv": 1 if uv_source == 1 else 0,
        "source": uv_source,
        "flags": int(getattr(layer, "flags", 0)),
    }


def write_static_m3_geometry(m3_module, source: Path, target: Path) -> dict | None:
    model = m3_module.loadModel(str(source))
    vertex_name = "VertexFormat" + hex(model.vFlags)
    if not model.vertices or vertex_name not in m3_module.structures:
        return None
    description = m3_module.structures[vertex_name].getVersion(0)
    count = len(model.vertices) // description.size
    vertices = description.createInstances(buffer=model.vertices, count=count)

    vertex_data = np.empty((count, 10), dtype="<f4")
    for index, vertex in enumerate(vertices):
        uv0 = getattr(vertex, "uv0", None)
        uv1 = getattr(vertex, "uv1", None)
        vertex_data[index] = (
            vertex.position.x,
            vertex.position.y,
            vertex.position.z,
            vertex.normal.x,
            vertex.normal.y,
            vertex.normal.z,
            (uv0.x / 2048) if uv0 is not None else 0,
            (uv0.y / 2048) if uv0 is not None else 0,
            (uv1.x / 2048) if uv1 is not None else 0,
            (uv1.y / 2048) if uv1 is not None else 0,
        )

    indices: list[int] = []
    batches: list[dict] = []
    for division in model.divisions:
        faces = division.faces
        for object_mesh in division.objects:
            material_reference = model.materialReferences[object_mesh.materialReferenceIndex]
            if material_reference.materialType != 1:
                continue
            material = model.standardMaterials[material_reference.materialIndex]
            region = division.regions[object_mesh.regionIndex]
            first_index = len(indices)
            start = region.firstFaceVertexIndexIndex
            stop = start + region.numberOfFaceVertexIndices
            base = region.firstVertexIndex
            legacy = region.structureDescription.structureVersion <= 2
            for cursor in range(start, stop, 3):
                triangle = [base + int(faces[cursor + offset]) for offset in range(3)]
                if legacy:
                    triangle = [value - base for value in triangle]
                if min(triangle) < 0 or max(triangle) >= count or len(set(triangle)) < 3:
                    continue
                indices.extend(triangle)
            batches.append(
                {
                    "firstIndex": first_index,
                    "indexCount": len(indices) - first_index,
                    "blendMode": int(material.blendMode),
                    "cutout": int(material.cutoutThresh) / 255,
                    "doubleSided": bool(material.flags & 0x8),
                    "uvScale": float(getattr(region, "uvwMult", 16.0)) / 16,
                    "uvOffset": float(getattr(region, "uvwOffset", 0.0)),
                    "diffuse": material_layer(material, "diffuseLayer"),
                    "decal": material_layer(material, "decalLayer"),
                    "alphaMask": material_layer(material, "alphaMaskLayer"),
                    "alphaMask2": material_layer(material, "alphaMask2Layer"),
                    "emissive": material_layer(material, "emissiveLayer"),
                    "emissive2": material_layer(material, "emissive2Layer"),
                    "emisMult": float(material.emisMult),
                }
            )

    if not indices:
        return None
    max_index = max(indices)
    if max_index > 65535:
        raise RuntimeError(f"{source.name} needs 32-bit indices ({max_index})")
    index_data = np.asarray(indices, dtype="<u2")
    mins = vertex_data[:, :3].min(axis=0)
    maxs = vertex_data[:, :3].max(axis=0)
    with target.open("wb") as stream:
        stream.write(b"TGM2")
        stream.write(struct.pack("<III6f", count, len(indices), len(batches), *mins, *maxs))
        stream.write(vertex_data.tobytes())
        stream.write(index_data.tobytes())
    return {
        "file": str(target.name),
        "vertices": count,
        "triangles": len(indices) // 3,
        "bounds": [float(value) for value in (*mins, *maxs)],
        "batches": batches,
    }


def build_native_asset_pack(
    scene: dict,
    native_root: Path,
    m3_addon: Path,
    output: Path,
) -> dict:
    """Convert the map's resolved HOTS M3 models to static, material-aware web geometry."""
    native_output = output / "native"
    geometry_output = native_output / "geometry"
    texture_output = native_output / "textures"
    geometry_output.mkdir(parents=True, exist_ok=True)
    texture_output.mkdir(parents=True, exist_ok=True)

    requested = {
        asset_key(item["native"]["asset"])
        for group in (scene["units"], scene["doodads"])
        for item in group
        if item.get("native", {}).get("asset")
    }
    available_models = {
        asset_key(str(path.relative_to(native_root))): path
        for path in native_root.rglob("*.m3")
    }
    texture_index: dict[str, str] = {}
    basename_index: dict[str, str] = {}
    failed_textures: list[str] = []

    def convert_texture(source: Path) -> tuple[str, str | None, str | None]:
        key = asset_key(str(source.relative_to(native_root)))
        target = texture_output / packed_name(key, ".webp")
        try:
            if not target.exists():
                with Image.open(source) as image:
                    converted = image.convert("RGBA")
                    converted.save(target, "WEBP", quality=88, method=4)
            web_path = str(target.relative_to(output)).replace("\\", "/")
            return key, web_path, None
        except Exception as error:  # Pillow does not support every rare DDS variant.
            return key, None, f"{key}: {error}"

    texture_sources = sorted(native_root.rglob("*.dds"))
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        for key, web_path, failure in executor.map(convert_texture, texture_sources):
            if failure:
                failed_textures.append(failure)
            elif web_path:
                texture_index[key] = web_path
                basename_index.setdefault(Path(key).name, web_path)

    sys.path.insert(0, str(m3_addon))
    import m3  # type: ignore

    geometry_index: dict[str, dict] = {}
    failed_models: list[str] = []
    for key in sorted(requested):
        source = available_models.get(key)
        if source is None:
            failed_models.append(f"{key}: asset was not extracted")
            continue
        target = geometry_output / packed_name(key, ".tgm2")
        try:
            info = write_static_m3_geometry(m3, source, target)
            if info:
                info["file"] = str(target.relative_to(output)).replace("\\", "/")
                geometry_index[key] = info
        except Exception as error:
            failed_models.append(f"{key}: {error}")

    return {
        "renderer": "native HOTS M3 static WebGL pipeline",
        "models": geometry_index,
        "textures": texture_index,
        "textureBasenames": basename_index,
        "counts": {
            "models": len(geometry_index),
            "textures": len(texture_index),
            "unresolvedModels": len(requested - geometry_index.keys()),
            "failedTextures": len(failed_textures),
        },
        "failures": {"models": failed_models, "textures": failed_textures},
    }


def decode_texture_masks(raw: bytes) -> tuple[list[np.ndarray], int, int]:
    magic, version, _unknown, width, height = struct.unpack_from("<4sIIII", raw, 0)
    if magic != b"MASK":
        raise RuntimeError(f"Unsupported texture-mask magic: {magic!r}")
    block_width = width // 64
    block_height = height // 64
    blocks_per_layer = block_width * block_height
    block_size = 64 * 32
    layer_count = (len(raw) - 64) // (blocks_per_layer * block_size)
    layers = []
    for layer_index in range(layer_count):
        layer = np.zeros((height, width), dtype=np.uint8)
        layer_offset = 64 + layer_index * blocks_per_layer * block_size
        for block_index in range(blocks_per_layer):
            packed = np.frombuffer(
                raw,
                dtype=np.uint8,
                offset=layer_offset + block_index * block_size,
                count=block_size,
            ).reshape(64, 32)
            block = np.empty((64, 64), dtype=np.uint8)
            block[:, 0::2] = packed >> 4
            block[:, 1::2] = packed & 0x0F
            block_y, block_x = divmod(block_index, block_width)
            layer[block_y * 64 : (block_y + 1) * 64, block_x * 64 : (block_x + 1) * 64] = block
        layers.append(layer)
    return layers, width, height


def compose_terrain_albedo(
    archive: mpyq.MPQArchive,
    terrain_xml: etree._Element,
    texture_root: Path,
    output: Path,
) -> dict:
    height_map = terrain_xml.find("heightMap")
    texture_nodes = height_map.findall("textureList/texture")
    texture_ids = [node.get("name") for node in texture_nodes if node.get("name")]
    masks, width, height = decode_texture_masks(archive.read_file(b"t3TextureMasks"))
    if len(texture_ids) < len(masks):
        raise RuntimeError(f"Texture list has {len(texture_ids)} entries for {len(masks)} masks")
    extracted = {path.stem.lower(): path for path in texture_root.rglob("*.dds")}
    uv_values = [float(value) for value in height_map.get("uvtiling").split()]
    tile_x, tile_y, offset_x, offset_y = uv_values
    u = np.mod(np.arange(width, dtype=np.float32) / width * tile_x + offset_x, 1)
    v = np.mod(np.arange(height, dtype=np.float32) / height * tile_y + offset_y, 1)
    composite = np.zeros((height, width, 3), dtype=np.float32)
    sources = []
    for index, mask in enumerate(masks):
        texture_id = texture_ids[index]
        path = extracted.get(texture_id.lower())
        if path is None:
            raise FileNotFoundError(f"Missing terrain texture {texture_id}.dds under {texture_root}")
        with Image.open(path) as source_image:
            texture = np.asarray(source_image.convert("RGB"), dtype=np.float32)
        texture_height, texture_width = texture.shape[:2]
        x_indices = np.minimum((u * texture_width).astype(np.int32), texture_width - 1)
        y_indices = np.minimum((v * texture_height).astype(np.int32), texture_height - 1)
        tiled = texture[y_indices[:, None], x_indices[None, :]]
        composite += tiled * (mask[:, :, None].astype(np.float32) / 15)
        sources.append(path.name)
    image = Image.fromarray(np.clip(composite, 0, 255).astype(np.uint8), "RGB")
    target = output / "terrain-albedo.webp"
    image.save(target, "WEBP", quality=86, method=6)
    return {
        "file": target.name,
        "width": width,
        "height": height,
        "layers": len(masks),
        "uvTiling": uv_values,
        "sourceTextures": sources,
        "sourceMasks": "t3TextureMasks",
    }


def main() -> None:
    args = parse_args()
    if not args.stormmap.is_file():
        raise FileNotFoundError(args.stormmap)
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    archive = mpyq.MPQArchive(str(args.stormmap.resolve()))
    stale_minimap = output / "minimap.webp"
    if stale_minimap.exists():
        stale_minimap.unlink()
    map_info = parse_map_info(archive.read_file(b"MapInfo"))
    catalog = CatalogResolver(
        args.catalog_xml.resolve(),
        args.native_asset_root.resolve(),
    )
    scene = extract_scene(
        archive.read_file(b"Objects"),
        archive.read_file(b"Regions"),
        map_info["playableBounds"],
        catalog,
    )
    terrain_xml = etree.fromstring(archive.read_file(b"t3Terrain.xml"))
    terrain = extract_terrain(archive, output, map_info, scene, catalog)
    terrain_albedo = compose_terrain_albedo(
        archive,
        terrain_xml,
        args.terrain_texture_root.resolve(),
        output,
    )
    native_assets = build_native_asset_pack(
        scene,
        args.native_asset_root.resolve(),
        args.m3_addon.resolve(),
        output,
    )

    spawn_points = [
        point for point in scene["points"] if point["category"] == "spawn"
    ][:5]
    manifest = {
        "format": 1,
        "map": {
            "id": "cursed-hollow",
            "name": "Проклятая лощина",
            "source": args.stormmap.name,
            "bounds": map_info["playableBounds"],
        },
        "coordinateSystem": {
            "world": "SC2 map coordinates; origin at lower-left, Z-up in source assets",
            "fullTerrain": [0, 0, map_info["width"], map_info["height"]],
            "playableBounds": map_info["playableBounds"],
            "renderOrigin": [
                (map_info["playableBounds"][0] + map_info["playableBounds"][2]) / 2,
                (map_info["playableBounds"][1] + map_info["playableBounds"][3]) / 2,
            ],
            "baseHeight": map_info["baseHeight"],
            "terrainAverageHeight": terrain["averageHeight"],
        },
        "terrain": terrain,
        "terrainAlbedo": terrain_albedo,
        "scene": "scene.json",
        "nativeAssets": native_assets,
        "spawnPoints": [point["position"] for point in spawn_points],
        "provenance": {
            "mapArchive": "Cursed.Hollow.stormmap",
            "mapData": ["MapInfo", "Objects", "Regions", "t3Terrain.xml", "t3HeightMap", "t3TextureMasks"],
            "navigationData": ["CellAttribute_Pcl", "CellAttribute_Vbl"],
            "modelData": "HeroesData CASC / native M3 models and catalog-resolved variations",
            "runtime": "client-only WebGL and JavaScript",
        },
    }
    (output / "scene.json").write_text(
        json.dumps(scene, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    (output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        f"Built {output}: {scene['counts']['units']} units, "
        f"{scene['counts']['doodads']} doodads, "
        f"{native_assets['counts']['models']} M3 models and "
        f"{native_assets['counts']['textures']} textures."
    )


if __name__ == "__main__":
    main()
