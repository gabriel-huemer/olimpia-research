"""Lists distinct answers (with counts) per column of the responses sheet."""
import collections
import sys

sys.path.insert(0, __file__.rsplit("\\", 1)[0])
from xlsx_read import read_sheet  # noqa: E402


def main(path: str, out: str, sheet: str, top: int) -> None:
    rows = read_sheet(path, sheet)
    header = rows[0]
    counters = collections.defaultdict(collections.Counter)
    for row in rows[1:]:
        for i, v in row.items():
            counters[i][v] += 1
    with open(out, "w", encoding="utf-8") as f:
        for i in sorted(header):
            c = counters[i]
            f.write(f"\n### [{i}] {header[i]}  (distinct={len(c)}, filled={sum(c.values())})\n")
            for v, n in c.most_common(top):
                f.write(f"  {n:5d}  {v[:160]}\n")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]))
