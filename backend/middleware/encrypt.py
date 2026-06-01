"""加密存储模块 — Fernet三层密钥管理（来自发票系统）"""
from cryptography.fernet import Fernet, MultiFernet
from pathlib import Path
import os

SECRET_DIR = Path("/root/.wms-secrets")
FERNET_KEY_FILE = SECRET_DIR / "fernet.key"
FERNET_PREV_KEY_FILE = SECRET_DIR / "fernet.prev.key"

_fernet_instance = None


def init_crypto():
    """初始化密钥（首次部署时生成，后续加载）"""
    global _fernet_instance
    SECRET_DIR.mkdir(parents=True, exist_ok=True)
    if not FERNET_KEY_FILE.exists():
        key = Fernet.generate_key()
        FERNET_KEY_FILE.write_text(key.decode())
        FERNET_KEY_FILE.chmod(0o600)
    current_key = Fernet(FERNET_KEY_FILE.read_text().encode())
    if FERNET_PREV_KEY_FILE.exists():
        prev_key = Fernet(FERNET_PREV_KEY_FILE.read_text().encode())
        _fernet_instance = MultiFernet([current_key, prev_key])
    else:
        _fernet_instance = current_key


def get_fernet():
    global _fernet_instance
    return _fernet_instance


def encrypt(plaintext: str) -> str:
    f = get_fernet()
    if f is None:
        raise RuntimeError("加密模块未初始化，请先调用 init_crypto()")
    return f.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    f = get_fernet()
    if f is None:
        raise RuntimeError("加密模块未初始化，请先调用 init_crypto()")
    return f.decrypt(ciphertext.encode()).decode()


def rotate_keys():
    """密钥轮换（保留带时间戳的历史密钥）"""
    from datetime import datetime
    import shutil
    if FERNET_KEY_FILE.exists():
        ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        backup = SECRET_DIR / f"fernet.{ts}.key"
        shutil.copy(FERNET_KEY_FILE, backup)
        shutil.copy(FERNET_KEY_FILE, FERNET_PREV_KEY_FILE)
    new_key = Fernet.generate_key()
    FERNET_KEY_FILE.write_text(new_key.decode())
    FERNET_KEY_FILE.chmod(0o600)
    init_crypto()
