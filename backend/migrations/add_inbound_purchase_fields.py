"""Migration: Add purchase_type and contract_no to inbound table"""
from sqlalchemy import text


def migrate(engine):
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE inbound ADD COLUMN IF NOT EXISTS purchase_type VARCHAR(32) DEFAULT ''"
        ))
        conn.execute(text(
            "ALTER TABLE inbound ADD COLUMN IF NOT EXISTS contract_no VARCHAR(64) DEFAULT ''"
        ))
        conn.commit()
        print("[migration] inbound: added purchase_type, contract_no columns")


if __name__ == "__main__":
    import os
    from sqlalchemy import create_engine
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: DATABASE_URL not set")
        exit(1)
    migrate(create_engine(url))
