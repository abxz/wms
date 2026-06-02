"""员工表迁移：新增岗位/学历/身份证/地址字段"""
from sqlalchemy import text
from core.database import engine

def migrate():
    with engine.connect() as conn:
        for col, dtype in [
            ("position", "VARCHAR(64) DEFAULT ''"),
            ("education", "VARCHAR(32) DEFAULT ''"),
            ("id_card", "VARCHAR(18) DEFAULT ''"),
            ("address", "VARCHAR(256) DEFAULT ''"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE employees ADD COLUMN IF NOT EXISTS {col} {dtype}"))
                conn.commit()
                print(f"  ✓ {col}")
            except Exception as e:
                print(f"  - {col}: {e}")

if __name__ == "__main__":
    migrate()
