"""Converts a Framelink Figma dump into compact one-line-per-node text with resolved variables."""
import json
import re
import sys


def parse_block(lines):
    """Tiny indentation YAML subset parser (dicts, '- ' scalar lists, scalars)."""
    root: dict = {}
    # stack entries: (indent, container, owner_dict, owner_key)
    stack = [(-1, root, None, None)]
    for raw in lines:
        if not raw.strip():
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        line = raw.strip()
        if line.startswith("- "):
            # list items belong to the most recent key at a lower or equal indent
            while len(stack) > 1 and stack[-1][0] > indent:
                stack.pop()
            _, container, owner, key = stack[-1]
            val = line[2:].strip().strip("'\"")
            if owner is not None:
                if not isinstance(owner[key], list):
                    owner[key] = []
                owner[key].append(val)
            continue
        while stack and stack[-1][0] >= indent:
            stack.pop()
        parent = stack[-1][1]
        k, _, v = line.partition(":")
        v = v.strip()
        if v == "":
            node: dict = {}
            parent[k] = node
            stack.append((indent, node, parent, k))
        else:
            parent[k] = v.strip("'\"")
    return root


def short_style(s):
    if not isinstance(s, dict):
        return str(s)
    parts = [str(s.get("fontWeight", s.get("fontStyle", ""))), str(s.get("fontSize", ""))]
    if "lineHeight" in s:
        parts.append("lh" + str(s["lineHeight"]).replace("px", ""))
    if "letterSpacing" in s:
        parts.append("ls" + str(s["letterSpacing"]))
    if s.get("textAlignHorizontal") not in (None, "LEFT"):
        parts.append(s["textAlignHorizontal"][0])
    if "fills" in s:
        parts.append("c" + ",".join(s["fills"]))
    return "/".join(p for p in parts if p)


def main(src, out):
    text = open(src, encoding="utf-8").read().splitlines()
    gi = text.index("GLOBAL_VARS:")
    ei = text.index("ELEMENTS:")
    ni = text.index("NODES:")
    gv = parse_block(text[gi + 1:ei])
    els = parse_block(text[ei + 1:ni])

    def fill(v):
        if v is None:
            return None
        if v.startswith("["):
            return ",".join(json.loads(v))
        x = gv.get(v, v)
        return ",".join(x) if isinstance(x, list) else str(x)

    def layout(v):
        if v is None:
            return None
        d = json.loads(v) if v.startswith("{") else gv.get(v, {})
        loc = d.get("locationRelativeToParent", {})
        dim = d.get("dimensions", {})
        return f"@{loc.get('x', 0)},{loc.get('y', 0)} {dim.get('width', '?')}x{dim.get('height', '?')}"

    def style(v):
        if v is None:
            return None
        if v.startswith("{"):
            return short_style(json.loads(v))
        return short_style(gv.get(v, v))

    ts = {k: short_style(v) for k, v in gv.items() if re.fullmatch(r"ts\d+", k)}
    attr_re = re.compile(r'(\w+)=("(?:[^"\\]|\\.)*"|\{.*?\}(?= \w+=|$)|\[.*?\](?= \w+=|$)|\S+)')
    with open(out, "w", encoding="utf-8") as f:
        f.write("TEXT RUN STYLES: " + json.dumps(ts, ensure_ascii=False) + "\n")
        for line in text[ni + 1:]:
            m = re.match(r'^(\s*)\[(\w+)\](?: "([^"]*)")? #(\S+)\s*(.*)$', line)
            if not m:
                continue
            ind, typ, name, nid, rest = m.groups()
            if name in ("status", "status dark", "bar", "batt", "I") or rest.endswith('text="10:42"') \
                    or "EL-d76f3012" in rest:
                continue
            attrs = dict(attr_re.findall(rest))
            tpl = attrs.pop("template", None)
            if tpl:
                e = els.get(tpl, {})
                lay = e.get("layout")
                if isinstance(lay, dict):
                    attrs.setdefault("layout", json.dumps(lay))
                elif lay:
                    attrs.setdefault("layout", lay)
                for k in ("fills", "strokes", "borderRadius", "text", "strokeWeight"):
                    if k in e:
                        attrs.setdefault(k, e[k])
                ts_ = e.get("textStyle")
                if isinstance(ts_, dict):
                    attrs.setdefault("textStyle", json.dumps(ts_))
                elif ts_:
                    attrs.setdefault("textStyle", ts_)
            lay = attrs.get("layout")
            if lay and lay.startswith("{") and '"x"' in lay and isinstance(lay, str):
                try:
                    json.loads(lay)
                except ValueError:
                    pass
            parts = [ind + typ[:4], (name or ""), layout(lay) or ""]
            if "fills" in attrs:
                parts.append("bg" + fill(attrs["fills"]))
            if "strokes" in attrs:
                parts.append("bd" + fill(attrs["strokes"]) + "/" + str(attrs.get("strokeWeight", "")))
            if "borderRadius" in attrs:
                parts.append("r" + attrs["borderRadius"].strip('"').replace("px", ""))
            if "effects" in attrs:
                parts.append("fx" + attrs["effects"])
            if "textStyle" in attrs:
                parts.append("ts" + style(attrs["textStyle"]))
            if "text" in attrs:
                parts.append("T=" + attrs["text"].strip('"'))
            f.write(" ".join(p for p in parts if p) + "\n")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
