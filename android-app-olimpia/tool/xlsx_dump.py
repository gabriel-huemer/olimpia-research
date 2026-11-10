"""Dumps the sheets of an .xlsx file as tab-separated text (stdlib only)."""
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def col_index(ref: str) -> int:
    letters = "".join(c for c in ref if c.isalpha())
    n = 0
    for c in letters:
        n = n * 26 + (ord(c) - 64)
    return n - 1


def main(path: str, max_rows: int, only_sheet: str | None) -> None:
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    targets = {r.get("Id"): r.get("Target") for r in rels}
    for sheet in wb.find("m:sheets", NS):
        name = sheet.get("name")
        if only_sheet and name != only_sheet:
            continue
        target = targets[sheet.get(REL)].lstrip("/")
        if not target.startswith("xl/"):
            target = "xl/" + target
        root = ET.fromstring(z.read(target))
        rows = root.findall(".//m:sheetData/m:row", NS)
        print(f"=== SHEET: {name} ({len(rows)} rows) ===")
        for row in rows[:max_rows]:
            cells = {}
            for c in row.findall("m:c", NS):
                v = c.find("m:v", NS)
                t = c.get("t")
                if t == "s" and v is not None:
                    val = shared[int(v.text)]
                elif t == "inlineStr":
                    val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
                else:
                    val = v.text if v is not None else ""
                if val:
                    cells[col_index(c.get("r"))] = val.replace("\n", " ").strip()
            if cells:
                print(row.get("r"), "|", " | ".join(f"{k}:{cells[k]}" for k in sorted(cells)))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 50,
         sys.argv[3] if len(sys.argv) > 3 else None)
