"""Writes one sheet as compact text lines: '<row> | c:value | ...' (skips numeric-only/error cells)."""
import sys
from pathlib import Path

sys.path.insert(0, __file__.rsplit("\\", 1)[0])
from xlsx_read import read_sheet  # noqa: E402

ROOT_DIR = Path(__file__).resolve().parent.parent


def resolve_safe_path(user_path: str) -> Path:
    candidate = Path(user_path).resolve()
    if not candidate.is_relative_to(ROOT_DIR):
        raise ValueError(f"Path outside project root ({ROOT_DIR}): {candidate}")
    return candidate


def is_noise(v: str) -> bool:
    if v.startswith("#"):
        return True
    try:
        float(v)
        return True
    except ValueError:
        return False


def main(path: str, sheet: str, out: str) -> None:
    safe_in = resolve_safe_path(path)
    safe_out = resolve_safe_path(out)
    rows = read_sheet(str(safe_in), sheet)
    lines: list[str] = []
    for n, row in enumerate(rows, 1):
        cells = {k: v for k, v in row.items() if not is_noise(v)}
        if cells:
            lines.append(f"{n} | " + " | ".join(f"{k}:{v[:140]}" for k, v in sorted(cells.items())))
    safe_out.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
