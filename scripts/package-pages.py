from __future__ import annotations

import hashlib
import os
import shutil
import tarfile
import tempfile
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]
SITE = (REPO / "site").resolve()
DEPLOY = (REPO / "deploy").resolve()
CHUNK_SIZE = 384_000
REQUIRED = {
    "lab/training-data.json",
    "training-suite.js",
    "lab/game-assets/training-maps/warhead_junction.png",
}


def inside(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


def main() -> None:
    if not SITE.is_dir() or not DEPLOY.is_dir():
        raise RuntimeError("Expected site/ and deploy/ inside the repository")
    if not inside(SITE, REPO) or not inside(DEPLOY, REPO):
        raise RuntimeError("Resolved packaging paths escaped the repository")

    temporary = Path(tempfile.mkdtemp(prefix=".pages-package-", dir=REPO)).resolve()
    if not inside(temporary, REPO):
        raise RuntimeError("Unsafe temporary directory")

    try:
        archive = temporary / "site.tar.gz"
        with tarfile.open(archive, "w:gz", compresslevel=9) as output:
            output.add(SITE, arcname=".")

        with tarfile.open(archive, "r:gz") as packaged:
            names = {name.removeprefix("./") for name in packaged.getnames()}
        missing = REQUIRED - names
        if missing:
            raise RuntimeError(f"Deployment archive is missing: {sorted(missing)}")

        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        created: set[str] = set()
        with archive.open("rb") as source:
            index = 0
            while chunk := source.read(CHUNK_SIZE):
                name = f"site.tar.gz.part-{index:03d}"
                (temporary / name).write_bytes(chunk)
                created.add(name)
                index += 1

        checksum_name = "site.tar.gz.sha256"
        (temporary / checksum_name).write_text(
            f"{digest}  site.tar.gz\n", encoding="utf-8", newline="\n"
        )

        for name in sorted(created | {checksum_name}):
            os.replace(temporary / name, DEPLOY / name)

        for stale in DEPLOY.glob("site.tar.gz.part-*"):
            if stale.name not in created:
                stale.unlink()

        print(
            f"Deployment archive: {archive.stat().st_size} bytes; "
            f"{len(created)} parts; sha256 {digest}"
        )
    finally:
        if inside(temporary, REPO):
            shutil.rmtree(temporary, ignore_errors=True)


if __name__ == "__main__":
    main()
