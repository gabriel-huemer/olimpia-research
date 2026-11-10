"""Writes one sheet as compact text lines: '<row> | c:value | ...' (skips numeric-only/error cells)."""
import sys

sys.path.insert(0, __file__.rsplit("\\", 1)[0])
from xlsx_read import read_sheet  # noqa: E402


def is_noise(v: str) -> bool:
    if v.startswith("#"):
        return True
    try:
        float(v)
        return True
    except ValueError:
        return False


def main(path: str, sheet: str, out: str) -> None:
    rows = read_sheet(path, sheet)
    with open(out, "w", encoding="utf-8") as f:
        for n, row in enumerate(rows, 1):
            cells = {k: v for k, v in row.items() if not is_noise(v)}
            if cells:
                f.write(f"{n} | " + " | ".join(f"{k}:{v[:140]}" for k, v in sorted(cells.items())) + "\n")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
