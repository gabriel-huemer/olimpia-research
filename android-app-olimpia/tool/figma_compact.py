"""Converts a Framelink Figma dump into compact one-line-per-node text with resolved variables."""
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent


def resolve_safe_path(user_path: str) -> Path:
    candidate = Path(user_path).resolve()
    if not candidate.is_relative_to(ROOT_DIR):
        raise ValueError(f"Path outside project root ({ROOT_DIR}): {candidate}")
    return candidate


def parse_block(lines):
    """Tiny indentation YAML subset parser (dicts, '- ' scalar lists, scalars)."""
    root: dict = {}
    stack = [(-1, root, None, None)]
    for raw in lines:
        if not raw.strip():
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        line = raw.strip()
        if line.startswith("- "):
            while len(stack) > 1 and stack[-1][0] > indent:
                stack.pop()
            _, _, owner, key = stack[-1]
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


def parse_node_header(line: str):
    """Linear-time parser for node lines without backtracking regex."""
    stripped = line.lstrip(" ")
    if not stripped.startswith("["):
        return None
    ind = line[: len(line) - len(stripped)]
    close_bracket = stripped.find("]")
    if close_bracket < 0:
        return None
    typ = stripped[1:close_bracket]
    rem = stripped[close_bracket + 1 :].lstrip(" ")
    name = None
    if rem.startswith('"'):
        end_quote = rem.find('"', 1)
        if end_quote < 0:
            return None
        name = rem[1:end_quote]
        rem = rem[end_quote + 1 :].lstrip(" ")
    if not rem.startswith("#"):
        return None
    space_idx = rem.find(" ")
    if space_idx < 0:
        return ind, typ, name, rem[1:], ""
    nid = rem[1:space_idx]
    rest = rem[space_idx + 1 :].strip()
    return ind, typ, name, nid, rest


def parse_attrs_linear(rest: str) -> dict:
    """Linear-time key=value scanner supporting quoted strings, braces, and brackets."""
    attrs: dict = {}
    i, n = 0, len(rest)
    while i < n:
        while i < n and rest[i] == " ":
            i += 1
        if i >= n:
            break
        eq = rest.find("=", i)
        if eq < 0:
            break
        key = rest[i:eq].strip()
        i = eq + 1
        if i >= n:
            attrs[key] = ""
            break
        ch = rest[i]
        if ch == '"':
            j = i + 1
            while j < n:
                if rest[j] == "\\":
                    j += 2
                elif rest[j] == '"':
                    j += 1
                    break
                else:
                    j += 1
            attrs[key] = rest[i:j]
            i = j
        elif ch in ("{", "["):
            closing = "}" if ch == "{" else "]"
            depth = 0
            j = i
            while j < n:
                if rest[j] == ch:
                    depth += 1
                elif rest[j] == closing:
                    depth -= 1
                    if depth == 0:
                        j += 1
                        break
                j += 1
            attrs[key] = rest[i:j]
            i = j
        else:
            j = rest.find(" ", i)
            if j < 0:
                j = n
            attrs[key] = rest[i:j]
            i = j
    return attrs


def main(src, out):
    src_path = resolve_safe_path(src)
    out_path = resolve_safe_path(out)
    text = src_path.read_text(encoding="utf-8").splitlines()
    gi = text.index("GLOBAL_VARS:")
    ei = text.index("ELEMENTS:")
    ni = text.index("NODES:")
    gv = parse_block(text[gi + 1 : ei])
    els = parse_block(text[ei + 1 : ni])

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

    ts = {
        k: short_style(v)
        for k, v in gv.items()
        if k.startswith("ts") and k[2:].isdigit()
    }
    output_lines = ["TEXT RUN STYLES: " + json.dumps(ts, ensure_ascii=False)]
    for line in text[ni + 1 :]:
        parsed = parse_node_header(line)
        if not parsed:
            continue
        ind, typ, name, _, rest = parsed
        if (
            name in ("status", "status dark", "bar", "batt", "I")
            or rest.endswith('text="10:42"')
            or "EL-d76f3012" in rest
        ):
            continue
        attrs = parse_attrs_linear(rest)
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
        output_lines.append(" ".join(p for p in parts if p))

    out_path.write_text("\n".join(output_lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
