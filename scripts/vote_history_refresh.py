import sys
import subprocess
import importlib
import re
from pathlib import Path
from argparse import ArgumentParser

# =========================
# Self-bootstrap dependencies
# =========================
REQUIRED_PACKAGES = ["beautifulsoup4", "jinja2"]

def ensure_packages():
    for pkg in REQUIRED_PACKAGES:
        try:
            importlib.import_module(pkg.replace("-", "_"))
        except ImportError:
            print(f"Installing missing dependency: {pkg}")
            subprocess.check_call([sys.executable, "-m", "pip", "install", pkg])

ensure_packages()

from bs4 import BeautifulSoup
from jinja2 import Environment, FileSystemLoader

# =========================
# Shared parsing functions
# =========================
def detect_columns(table):
    headers = [th.get_text(strip=True).lower() for th in table.find_all("th")]
    mapping = {}
    for i, name in enumerate(headers):
        if name == "type":
            mapping["type"] = i
        elif name == "name":
            mapping["name"] = i
        elif name == "status":
            mapping["status"] = i
    return mapping

def parse_actions(html, id_prefix="genre"):
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")
    if not tables:
        raise RuntimeError("Could not find any tables in HTML")
    table = max(tables, key=lambda t: len(t.find_all("tr")))

    column_map = detect_columns(table)
    actions = []

    for tr in reversed(table.find_all("tr")):  # oldest → newest
        tds = tr.find_all("td")
        if len(tds) < 4:
            continue

        # Status (approved)
        status_index = column_map.get("status", -2)
        approval = tds[status_index].get_text(strip=True)
        if approval != "a":
            continue

        # ID extraction
        id_td = tds[-4].get_text(strip=True)
        match = re.search(rf"\[{id_prefix}(\d+)\]", id_td)
        if not match:
            continue
        entity_id = int(match.group(1))

        type_index = column_map.get("type", 2)
        action = tds[type_index].get_text(strip=True)

        name_index = column_map.get("name", 3)
        name = tds[name_index].get_text(strip=True)

        actions.append((entity_id, action, name))

    return actions

def apply_actions(actions):
    entities = {}
    for entity_id, action, name in actions:
        if action in ("Add", "Update"):
            entities[entity_id] = name
        elif action in ("Delete", "Merge"):
            entities.pop(entity_id, None)
    return entities

def read_existing(ts_file):
    if not ts_file.exists():
        return {}
    text = ts_file.read_text(encoding="utf-8")
    # Match either single or double quotes
    matches = re.findall(r"\[(\d+), (['\"])(.*?)\2\]", text)
    entities = {}
    for i, quote, name in matches:
        # Unescape single quotes if needed
        name = name.replace("\\'", "'").replace('\\"', '"')
        entities[int(i)] = name
    return entities

def write_ts(entities, ts_file, template_file):
    template = TEMPLATE_ENV.get_template(template_file)
    items = sorted(entities.items(), key=lambda x: x[1].lower())
    output = template.render(entities=items)
    ts_file.write_text(output + "\n", encoding="utf-8")

def write_txt(entities, txt_file, id_prefix):
    with open(txt_file, "w", encoding="utf-8") as f:
        for entity_id in sorted(entities):
            f.write(f"{entity_id}. [{id_prefix}{entity_id}]\n")

def print_diff(old, new):
    old_ids = set(old)
    new_ids = set(new)
    added = new_ids - old_ids
    removed = old_ids - new_ids
    renamed = {gid for gid in new_ids & old_ids if old[gid] != new[gid]}

    print(f"Added: {len(added)} | Removed: {len(removed)} | Renamed: {len(renamed)}")
    if added:
        print("New:", ", ".join(f"{new[gid]} ({gid})" for gid in sorted(added)))
    if removed:
        print("Removed:", ", ".join(f"{old[gid]} ({gid})" for gid in sorted(removed)))
    if renamed:
        print("Renamed:", ", ".join(f"{old[gid]}→{new[gid]} ({gid})" for gid in sorted(renamed)))

# =========================
# Main routine
# =========================
PROJECT_ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_ENV = Environment(loader=FileSystemLoader(PROJECT_ROOT / "scripts"), autoescape=False)

def refresh_entity(html_file, ts_file, txt_file, template_file, id_prefix):
    if not html_file.exists():
        raise RuntimeError(f"Missing HTML file: {html_file}")
    html = html_file.read_text(encoding="utf-8")

    actions = parse_actions(html, id_prefix=id_prefix)
    entities = apply_actions(actions)
    if id_prefix == "descriptor":
        EXCEPTIONS = {"Biblical", "Christian", "Christmas", "Hindu", "Islamic", "Judaic","LGBTQ", "Wall of Sound"}
        filtered_entities = {}
        excluded_entities = {}

        for eid, name in entities.items():
            if name.islower() or name in EXCEPTIONS:
                filtered_entities[eid] = name
            else:
                excluded_entities[eid] = name

        entities = filtered_entities

        # Debug output
        if excluded_entities:
            print("\nExcluded descriptors (debug):")
            for eid, name in sorted(excluded_entities.items(), key=lambda x: x[1].lower()):
                print(f"{eid}. {name}")

    old_entities = read_existing(ts_file)

    if not entities:
        print(f"Warning: No approved {id_prefix}s found in {html_file}. Skipping write.")
        return

    print_diff(old_entities, entities)

    write_ts(entities, ts_file, template_file)
    write_txt(entities, txt_file, id_prefix)

    print(f"\nUpdated TS file: {ts_file}")
    print(f"Updated TXT file: {txt_file}")
    print(f"Total {id_prefix}s: {len(entities)}")

# =========================
# CLI
# =========================
def main():
    parser = ArgumentParser(description="Refresh genres or descriptors")
    parser.add_argument("entity", choices=["genre", "descriptor"], help="Entity type")
    args = parser.parse_args()

    if args.entity == "genre":
        refresh_entity(
            html_file=PROJECT_ROOT / "scripts/genre_history.htm",
            ts_file=PROJECT_ROOT / "src/modules/vote-history/data/genres.ts",
            txt_file=PROJECT_ROOT / "scripts/output/genres.txt",
            template_file="genres.ts.j2",
            id_prefix="genre"
        )
    else:
        refresh_entity(
            html_file=PROJECT_ROOT / "scripts/descriptor_history.htm",
            ts_file=PROJECT_ROOT / "src/modules/vote-history/data/descriptors.ts",
            txt_file=PROJECT_ROOT / "scripts/output/descriptors.txt",
            template_file="descriptors.ts.j2",
            id_prefix="descriptor"
        )

if __name__ == "__main__":
    main()