"""Migrate data/*.json files into PostgreSQL"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import models  # registers _TABLE_MODEL
from core.database import Base, engine, SessionLocal, _TABLE_MODEL, _ts
from core.utils import generate_id

DATA_DIR = Path(__file__).parent / "data"

TABLE_FILES = {
    "products": "products.json",
    "locations": "locations.json",
    "suppliers": "suppliers.json",
    "employees": "employees.json",
    "claims": "claims.json",
    "inventory": "inventory.json",
    "inbound": "inbound.json",
    "outbound": "outbound.json",
    "invoices": "invoices.json",
    "warehouses": "warehouses.json",
}


def migrate_table(table: str, filename: str):
    path = DATA_DIR / filename
    if not path.exists():
        print(f"  skip {filename} (not found)")
        return 0

    with open(path, encoding="utf-8") as f:
        rows = json.load(f)

    if not rows:
        print(f"  skip {filename} (empty)")
        return 0

    M = _TABLE_MODEL[table]
    cols = {c.name for c in M.__table__.columns}

    with SessionLocal() as db:
        inserted = 0
        for row in rows:
            row.setdefault("id", generate_id())
            row.setdefault("created_at", _ts())
            row.setdefault("updated_at", _ts())
            filtered = {k: v for k, v in row.items() if k in cols}
            existing = db.query(M).filter(M.id == filtered["id"]).first()
            if not existing:
                db.add(M(**filtered))
                inserted += 1
        db.commit()
    print(f"  {filename}: {inserted}/{len(rows)} rows inserted")
    return inserted


def migrate_system_config():
    path = DATA_DIR / "system_config.json"
    if not path.exists():
        return
    with open(path, encoding="utf-8") as f:
        config = json.load(f)
    M = models.SystemConfig
    with SessionLocal() as db:
        for k, v in config.items():
            existing = db.query(M).filter(M.key == k).first()
            if not existing:
                db.add(M(id=generate_id(), key=k, value=str(v)))
        db.commit()
    print(f"  system_config.json: {len(config)} keys migrated")


if __name__ == "__main__":
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    print("Migrating data...")
    for table, filename in TABLE_FILES.items():
        migrate_table(table, filename)
    migrate_system_config()

    print("Done.")
