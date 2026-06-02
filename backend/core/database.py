"""SQLAlchemy database engine and session + compatibility CRUD layer"""
import os
from datetime import datetime
from typing import Any, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL 环境变量必须配置")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

def init_schemas():
    with engine.connect() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS master_data"))
        conn.commit()

init_schemas()


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ts() -> str:
    return datetime.now().isoformat(timespec="seconds")


# ─── Table name → ORM model registry ─────────────────────────────────────────
# Populated by models.py after import
_TABLE_MODEL: dict = {}


def _model(table: str):
    m = _TABLE_MODEL.get(table)
    if m is None:
        raise KeyError(f"No ORM model registered for table '{table}'")
    return m


def _row_to_dict(row) -> dict:
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


# ─── Public CRUD (same signatures as the old JSON layer) ─────────────────────

def all_(table: str) -> list[dict]:
    M = _model(table)
    with SessionLocal() as db:
        return [_row_to_dict(r) for r in db.query(M).all()]


def get_by(table: str, field: str, value: Any) -> Optional[dict]:
    M = _model(table)
    with SessionLocal() as db:
        row = db.query(M).filter(getattr(M, field) == value).first()
        return _row_to_dict(row) if row else None


def get_by_id(table: str, id: str) -> Optional[dict]:
    return get_by(table, "id", id)


def add(table: str, record: dict) -> dict:
    from core.utils import generate_id
    M = _model(table)
    record.setdefault("id", generate_id())
    record.setdefault("created_at", _ts())
    record.setdefault("updated_at", _ts())
    with SessionLocal() as db:
        row = M(**record)
        db.add(row)
        db.commit()
        db.refresh(row)
        return _row_to_dict(row)


def update(table: str, id: str, updates: dict) -> Optional[dict]:
    M = _model(table)
    updates["updated_at"] = _ts()
    with SessionLocal() as db:
        row = db.query(M).filter(M.id == id).first()
        if not row:
            return None
        for k, v in updates.items():
            if hasattr(row, k):
                setattr(row, k, v)
        db.commit()
        db.refresh(row)
        return _row_to_dict(row)


def delete(table: str, id: str) -> bool:
    M = _model(table)
    with SessionLocal() as db:
        row = db.query(M).filter(M.id == id).first()
        if not row:
            return False
        db.delete(row)
        db.commit()
        return True


def query(table: str, **filters) -> list[dict]:
    M = _model(table)
    with SessionLocal() as db:
        q = db.query(M)
        for k, v in filters.items():
            if v is not None:
                q = q.filter(getattr(M, k) == v)
        return [_row_to_dict(r) for r in q.all()]


def paginate(table: str, page: int = 1, size: int = 20, search: str = "",
             sort_by: str = "updated_at", sort_desc: bool = True,
             search_fields: list[str] | None = None) -> dict:
    from sqlalchemy import or_, desc, asc
    M = _model(table)
    with SessionLocal() as db:
        q = db.query(M)
        if search and search_fields:
            s = f"%{search.lower()}%"
            q = q.filter(or_(*[
                getattr(M, f).ilike(s) for f in search_fields if hasattr(M, f)
            ]))
        if sort_by and hasattr(M, sort_by):
            col = getattr(M, sort_by)
            q = q.order_by(desc(col) if sort_desc else asc(col))
        total = q.count()
        items = q.offset((page - 1) * size).limit(size).all()
        return {
            "items": [_row_to_dict(r) for r in items],
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size,
        }


def atomic_modify(table: str, record_id: str, modifier) -> Optional[dict]:
    M = _model(table)
    with SessionLocal() as db:
        row = db.query(M).with_for_update().filter(M.id == record_id).first()
        if not row:
            return None
        d = _row_to_dict(row)
        new = modifier(d)
        if new is not None:
            new["updated_at"] = _ts()
            for k, v in new.items():
                if hasattr(row, k):
                    setattr(row, k, v)
            db.commit()
            db.refresh(row)
            return _row_to_dict(row)
        return d


def atomic_check_and_deduct(table: str, product_id: str, requested_qty: float) -> bool:
    M = _model(table)
    with SessionLocal() as db:
        row = db.query(M).with_for_update().filter(M.product_id == product_id).first()
        if not row:
            return False
        current = float(row.quantity or 0)
        if current < requested_qty:
            return False
        row.quantity = current - requested_qty
        row.updated_at = _ts()
        db.commit()
        return True
