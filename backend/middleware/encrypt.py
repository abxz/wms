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
    return get_fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    return get_fernet().decrypt(ciphertext.encode()).decode()


def rotate_keys():
    """密钥轮换"""
    if FERNET_KEY_FILE.exists():
        FERNET_KEY_FILE.rename(FERNET_PREV_KEY_FILE)
    new_key = Fernet.generate_key()
    FERNET_KEY_FILE.write_text(new_key.decode())
    FERNET_KEY_FILE.chmod(0o600)
    init_crypto()
