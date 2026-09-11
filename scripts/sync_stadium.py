#!/usr/bin/env python3
"""
Sync The Stadium lot inventory from LandVest's public map feed.

Runs weekly from GitHub Actions (see .github/workflows/sync-stadium.yml) and
can be run by hand:  python3 scripts/sync_stadium.py

Source: the Groov widget embedded on
  https://www.landvestidaho.com/communities/stadium-subdivision
which loads its data from a plain JSON endpoint — no browser or login needed.

What this touches in data/stadium-lots.geojson:
  status    — LandVest is the developer and is authoritative for lot status.
  lotPrice  — LandVest sets lot prices.
What it deliberately leaves alone:
  builder, homePrice, address, mls — not in the feed; these come from the
              builder tracker and would be wiped otherwise.
  acres     — surveyed plat acreage stays; LandVest rounds differently.
  geometry, phase, block, lot — never change.

Merge rule worth knowing: a lot shown as "Home For Sale" (a builder-owned
spec home) is left alone. LandVest marks that lot "Sold" because the builder
bought it, but the house is still on the market. Only the tracker moves a lot
out of that state.

Safety: if the feed looks wrong (bad HTTP, wrong lot count, any lot that
doesn't map) the script exits non-zero and writes nothing. A stale map beats
a broken one.

Exit codes: 0 = lot changes applied, 3 = checked, no lot changes (timestamp still\nupdated), 1 = refused/failed and nothing written.
"""
import json, sys, urllib.request, datetime, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEO = os.path.join(ROOT, "data", "stadium-lots.geojson")
MAP = os.path.join(ROOT, "data", "stadium-lot-map.json")
REPORT = os.path.join(ROOT, "data", "stadium-sync.json")
FEED = "https://v3.widget-api.letsgroov.com/widget/5fae8008-b422-47de-874a-f44d91227519"
EXPECTED_LOTS = 82

STATUS = {"For Sale": "available", "Reserved": "reserved",
          "Pending": "pending", "Sold": "sold"}
STICKY = {"forsale"}   # builder spec homes — tracker-controlled


def fail(msg):
    print("REFUSED:", msg, file=sys.stderr)
    sys.exit(1)


def fetch():
    req = urllib.request.Request(FEED, headers={
        "User-Agent": "Mozilla/5.0 (cwreidaho stadium sync)",
        "Origin": "https://www.landvestidaho.com",
        "Referer": "https://www.landvestidaho.com/",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        if r.status != 200:
            fail(f"feed returned HTTP {r.status}")
        return json.load(r)


def main():
    data = fetch()
    try:
        props = data["data"]["bundle"]["properties"]
        phase_names = {p["name"] for p in data["data"]["bundle"]["phases"]}
    except (KeyError, TypeError):
        fail("feed shape changed — expected data.bundle.properties")
    if len(props) != EXPECTED_LOTS:
        fail(f"feed has {len(props)} lots, expected {EXPECTED_LOTS}")

    lotmap = json.load(open(MAP))
    phase_of = lotmap["phases"]
    if not phase_names <= set(phase_of):
        fail(f"unknown phase names in feed: {phase_names - set(phase_of)}")
    key_to_plat = {(x["phase"], x["block"], x["lot"]): x["platLot"] for x in lotmap["lots"]}

    geo = json.load(open(GEO))
    feats = {f["properties"]["platLot"]: f for f in geo["features"]}

    incoming = {}
    for q in props:
        m = re.fullmatch(r"(\d+)/(\d+)", q.get("propertyName") or "")
        if not m:
            fail(f"unparseable propertyName {q.get('propertyName')!r}")
        lot, block = int(m.group(1)), int(m.group(2))
        key = (phase_of[q["phaseName"]], block, lot)
        if key not in key_to_plat:
            fail(f"lot {key} not in stadium-lot-map.json")
        if q["status"] not in STATUS:
            fail(f"unknown LandVest status {q['status']!r} on lot {key}")
        incoming[key_to_plat[key]] = q

    changes, flags = [], []
    for plat, q in incoming.items():
        p = feats[plat]["properties"]
        label = f"Block {p['block']}, Lot {p['lot']}"
        new_status = STATUS[q["status"]]
        if p["status"] in STICKY:
            if q["status"] != "Sold":
                flags.append(f"{label}: shown as Home For Sale but LandVest says {q['status']} — check")
        elif new_status != p["status"]:
            note = "  [moved backward from sold — verify]" if p["status"] == "sold" else ""
            changes.append(f"{label}: {p['status']} -> {new_status}{note}")
            p["status"] = new_status
            p["statusText"] = {"available": "Available Lot", "reserved": "Reserved Lot",
                               "pending": "Pending", "sold": "Sold Lot"}[new_status]
        price = q.get("price")
        if price and price != p.get("lotPrice"):
            changes.append(f"{label}: lot price {p.get('lotPrice')} -> {price}")
            p["lotPrice"] = price

    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    report = {"synced": now, "source": "landvestidaho.com (Groov widget feed)",
              "lots_in_feed": len(props), "changes": changes, "flags": flags}
    json.dump(report, open(REPORT, "w"), indent=1)

    # Stamp every successful check, not just changes, so the page can say
    # "verified current as of <date>" even in a quiet week.
    geo["updated"] = now
    geo["source"] = report["source"]
    json.dump(geo, open(GEO, "w"), separators=(",", ":"))

    if not changes:
        print("No inventory changes.", *(["Flags:"] + flags if flags else []), sep="\n")
        sys.exit(3)
    print(f"Updated {len(changes)} field(s):", *changes, sep="\n  ")
    if flags:
        print("Flags:", *flags, sep="\n  ")


if __name__ == "__main__":
    main()
