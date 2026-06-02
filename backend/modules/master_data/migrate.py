"""Migrate products/suppliers/employees → master_data schema tables"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from core.database import SessionLocal, engine, Base
import models  # registers _TABLE_MODEL
import modules.master_data.models as md_models  # registers master_data models
from sqlalchemy import text


def migrate():
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        db.execute(text("CREATE SCHEMA IF NOT EXISTS master_data"))
        db.commit()

    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        # products → master_products
        rows = db.execute(text("SELECT id,name,sku,spec,unit,category,barcode,price,min_stock,max_stock,warehouse_id,location_id,supplier_id,active,remark,created_at,updated_at FROM products")).fetchall()
        for r in rows:
            existing = db.execute(text("SELECT id FROM master_data.master_products WHERE id=:id"), {"id": r.id}).first()
            if not existing:
                db.execute(text(
                    "INSERT INTO master_data.master_products(id,name,sku,spec,unit,category,barcode,price,min_stock,max_stock,warehouse_id,location_id,supplier_id,active,remark,created_at,updated_at) "
                    "VALUES(:id,:name,:sku,:spec,:unit,:category,:barcode,:price,:min_stock,:max_stock,:warehouse_id,:location_id,:supplier_id,:active,:remark,:created_at,:updated_at)"
                ), r._mapping)
        print(f"Migrated {len(rows)} products")

        # suppliers → master_suppliers
        rows = db.execute(text("SELECT id,name,contact,phone,address,remark,active,created_at,updated_at FROM suppliers")).fetchall()
        for r in rows:
            existing = db.execute(text("SELECT id FROM master_data.master_suppliers WHERE id=:id"), {"id": r.id}).first()
            if not existing:
                db.execute(text(
                    "INSERT INTO master_data.master_suppliers(id,name,contact,phone,address,remark,active,created_at,updated_at) "
                    "VALUES(:id,:name,:contact,:phone,:address,:remark,:active,:created_at,:updated_at)"
                ), r._mapping)
        print(f"Migrated {len(rows)} suppliers")

        # employees → master_employees
        rows = db.execute(text("SELECT id,name,employee_no,department,monthly_quota,monthly_used,active,created_at,updated_at FROM employees")).fetchall()
        for r in rows:
            existing = db.execute(text("SELECT id FROM master_data.master_employees WHERE id=:id"), {"id": r.id}).first()
            if not existing:
                db.execute(text(
                    "INSERT INTO master_data.master_employees(id,name,employee_no,department,monthly_quota,monthly_used,active,created_at,updated_at) "
                    "VALUES(:id,:name,:employee_no,:department,:monthly_quota,:monthly_used,:active,:created_at,:updated_at)"
                ), r._mapping)
        print(f"Migrated {len(rows)} employees")

        db.commit()
    print("Migration complete.")


if __name__ == "__main__":
    migrate()
