from pathlib import Path
import xml.etree.ElementTree as ET

SVG_DIR = Path(__file__).resolve().parents[1] / 'public' / 'svg'

ET.register_namespace('', 'http://www.w3.org/2000/svg')
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
ET.register_namespace('inkscape', 'http://www.inkscape.org/namespaces/inkscape')
ET.register_namespace('sodipodi', 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd')


def local(tag: str) -> str:
    return tag.split('}', 1)[-1] if '}' in tag else tag


def parse_viewbox(vb: str):
    parts = vb.replace(',', ' ').split()
    if len(parts) != 4:
        return None
    try:
        return [float(p) for p in parts]
    except ValueError:
        return None


changed: list[str] = []
skipped: list[str] = []
errors: list[tuple[str, str]] = []

for svg_path in sorted(SVG_DIR.glob('*.svg')):
    try:
        tree = ET.parse(svg_path)
        root = tree.getroot()

        if root.attrib.get('data-rotated-90') == 'true':
            skipped.append(svg_path.name)
            continue

        vb = root.attrib.get('viewBox')
        parsed = parse_viewbox(vb) if vb else None
        if not parsed:
            skipped.append(svg_path.name)
            continue

        _, _, old_w, old_h = parsed
        if old_w == 0 or old_h == 0:
            skipped.append(svg_path.name)
            continue

        new_w, new_h = old_h, old_w

        old_width_attr = root.attrib.get('width')
        old_height_attr = root.attrib.get('height')
        if old_width_attr is not None and old_height_attr is not None:
            root.set('width', old_height_attr)
            root.set('height', old_width_attr)

        root.set('viewBox', f"0 0 {new_w:.6f} {new_h:.6f}".rstrip('0').rstrip('.'))

        children = list(root)
        defs_like = {'defs', 'metadata', 'namedview', 'title', 'desc'}
        move = [c for c in children if local(c.tag) not in defs_like]
        if not move:
            skipped.append(svg_path.name)
            continue

        for c in move:
            root.remove(c)

        g = ET.Element('{http://www.w3.org/2000/svg}g', {
            'transform': f"translate({new_w:.6f} 0) rotate(90)",
        })
        for c in move:
            g.append(c)

        root.append(g)
        root.set('data-rotated-90', 'true')

        tree.write(svg_path, encoding='utf-8', xml_declaration=True)
        changed.append(svg_path.name)
    except Exception as exc:
        errors.append((svg_path.name, str(exc)))

print(f"changed={len(changed)}")
print(f"skipped={len(skipped)}")
print(f"errors={len(errors)}")
if changed:
    print('changed_sample=' + ', '.join(changed[:15]))
if errors:
    print('error_sample=' + str(errors[:5]))
