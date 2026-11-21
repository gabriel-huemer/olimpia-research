"""Lists distinct answers (with counts) per column of the responses sheet."""
import collections
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


def main(path: str, out: str, sheet: str, top: int) -> None:
    safe_in = resolve_safe_path(path)
    safe_out = resolve_safe_path(out)
    rows = read_sheet(str(safe_in), sheet)
    header = rows[0]
    counters = collections.defaultdict(collections.Counter)
    for row in rows[1:]:
        for i, v in row.items():
            counters[i][v] += 1
    lines: list[str] = []
    for i in sorted(header):
        c = counters[i]
        lines.append(f"\n### [{i}] {header[i]}  (distinct={len(c)}, filled={sum(c.values())})")
        for v, n in c.most_common(top):
            lines.append(f"  {n:5d}  {v[:160]}")
    safe_out.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]))
