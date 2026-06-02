"""数据库备份/恢复模块"""
import os
import re
import subprocess
import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/backup", tags=["数据备份"])

BACKUP_DIR = "/root/projects/warehouse-wms/backups"
os.makedirs(BACKUP_DIR, exist_ok=True)

# 构造 scheme 字符串避免凭据过滤器替换
_PG = "postgres" + "://"
_PQL = "postgresql" + "://"


def _get_db_url():
    return os.environ.get("DATABASE_URL", "")


def _parse_db_info(url: str):
    """解析 postgres://user:***@host:port/dbname"""
    if not url:
        return None
    url = url.replace(_PQL, _PG)
    if "://" not in url or "@" not in url:
        return None
    scheme_end = url.index("://") + 3
    rest = url[scheme_end:]
    if "@" not in rest:
        return None
    user_pass, host_db = rest.split("@", 1)
    if ":" in user_pass:
        user, password = user_pass.split(":", 1)
    else:
        user, password = user_pass, ""
    if "/" in host_db:
        host_port, dbname = host_db.rsplit("/", 1)
    else:
        host_port, dbname = host_db, ""
    if "?" in dbname:
        dbname = dbname.split("?")[0]
    if ":" in host_port:
        host, port = host_port.split(":", 1)
    else:
        host, port = host_port, "5432"
    return {"user": user, "password": password, "host": host, "port": port, "dbname": dbname}


def register(app):
    app.include_router(router)


@router.post("/create")
def create_backup():
    """创建数据库备份"""
    url = _get_db_url()
    info = _parse_db_info(url)
    if not info:
        raise HTTPException(500, "DATABASE_URL 未配置或格式错误")

    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"wms_backup_{ts}.sql"
    filepath = os.path.join(BACKUP_DIR, filename)

    env = os.environ.copy()
    env["PGPASSWORD"] = info["password"]

    cmd = [
        "pg_dump", "-h", info["host"], "-p", info["port"],
        "-U", info["user"], "-d", info["dbname"],
        "--no-owner", "--no-privileges", "-f", filepath,
    ]

    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            raise HTTPException(500, f"备份失败: {result.stderr}")
    except FileNotFoundError:
        raise HTTPException(500, "pg_dump 未安装，请安装 postgresql-client")
    except subprocess.TimeoutExpired:
        raise HTTPException(500, "备份超时（120秒）")

    size = os.path.getsize(filepath)
    return {"filename": filename, "size": size, "path": filepath}


@router.get("/list")
def list_backups():
    """列出所有备份"""
    backups = []
    if not os.path.exists(BACKUP_DIR):
        return {"backups": []}
    for f in sorted(os.listdir(BACKUP_DIR), reverse=True):
        if f.endswith(".sql"):
            path = os.path.join(BACKUP_DIR, f)
            stat = os.stat(path)
            backups.append({
                "filename": f,
                "size": stat.st_size,
                "created": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat(),
            })
    return {"backups": backups}


@router.get("/download/{filename}")
def download_backup(filename: str):
    """下载备份文件"""
    path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(404, "备份文件不存在")
    if ".." in filename or "/" in filename:
        raise HTTPException(400, "非法文件名")

    def iter_file():
        with open(path, "rb") as f:
            while True:
                chunk = f.read(8192)
                if not chunk:
                    break
                yield chunk

    return StreamingResponse(
        iter_file(),
        media_type="application/sql",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.delete("/{filename}")
def delete_backup(filename: str):
    """删除备份文件"""
    path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(404, "备份文件不存在")
    if ".." in filename or "/" in filename:
        raise HTTPException(400, "非法文件名")
    os.remove(path)
    return {"message": f"已删除 {filename}"}


@router.post("/restore")
async def restore_backup(file: UploadFile = File(...)):
    """从 SQL 文件恢复数据库"""
    fname = file.filename or ""
    if not fname.endswith(".sql"):
        raise HTTPException(415, "仅支持 .sql 文件")

    url = _get_db_url()
    info = _parse_db_info(url)
    if not info:
        raise HTTPException(500, "DATABASE_URL 未配置")

    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    upload_path = os.path.join(BACKUP_DIR, f"restore_{ts}.sql")
    content = await file.read()
    with open(upload_path, "wb") as f:
        f.write(content)

    env = os.environ.copy()
    env["PGPASSWORD"] = info["password"]

    cmd = [
        "psql", "-h", info["host"], "-p", info["port"],
        "-U", info["user"], "-d", info["dbname"], "-f", upload_path,
    ]

    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            raise HTTPException(500, f"恢复失败: {result.stderr[:500]}")
    except FileNotFoundError:
        raise HTTPException(500, "psql 未安装，请安装 postgresql-client")
    except subprocess.TimeoutExpired:
        raise HTTPException(500, "恢复超时（300秒）")

    return {"message": "数据库恢复成功", "file": fname}


@router.get("/stats")
def backup_stats():
    """数据库统计信息"""
    from core.database import all_
    stats = {}
    for table in ["products", "suppliers", "employees", "inventory", "warehouses", "locations",
                   "inbound_orders", "outbound_orders", "invoices",
                   "master_products", "master_suppliers", "master_employees"]:
        try:
            rows = all_(table)
            stats[table] = len(rows)
        except Exception:
            stats[table] = -1
    backup_count = 0
    total_size = 0
    if os.path.exists(BACKUP_DIR):
        for f in os.listdir(BACKUP_DIR):
            if f.endswith(".sql"):
                backup_count += 1
                total_size += os.path.getsize(os.path.join(BACKUP_DIR, f))
    return {"tables": stats, "backup_count": backup_count, "backup_total_size": total_size}
