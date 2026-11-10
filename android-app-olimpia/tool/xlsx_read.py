"""Minimal stdlib .xlsx reader: returns a sheet as a list of {col_index: value}."""
import zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
_T = "{%s}t" % NS["m"]
_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def _col_index(ref: str) -> int:
    n = 0
    for c in ref:
        if not c.isalpha():
            break
        n = n * 26 + (ord(c) - 64)
    return n - 1


def read_sheet(path: str, sheet_name: str) -> list[dict[int, str]]:
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        shared = ["".join(t.text or "" for t in si.iter(_T)) for si in root.findall("m:si", NS)]
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    targets = {r.get("Id"): r.get("Target") for r in rels}
    for sheet in wb.find("m:sheets", NS):
        if sheet.get("name") != sheet_name:
            continue
        target = targets[sheet.get(_REL)].lstrip("/")
        if not target.startswith("xl/"):
            target = "xl/" + target
        root = ET.fromstring(z.read(target))
        out = []
        for row in root.findall(".//m:sheetData/m:row", NS):
            cells = {}
            for c in row.findall("m:c", NS):
                v = c.find("m:v", NS)
                t = c.get("t")
                if t == "s" and v is not None:
                    val = shared[int(v.text)]
                elif t == "inlineStr":
                    val = "".join(x.text or "" for x in c.iter(_T))
                else:
                    val = v.text if v is not None else ""
                val = " ".join(val.split())
                if val:
                    cells[_col_index(c.get("r"))] = val
            out.append(cells)
        return out
    raise KeyError(sheet_name)
