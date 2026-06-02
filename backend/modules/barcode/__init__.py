"""条码/二维码生成模块"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import io, os, json
import qrcode
import sys
from urllib.parse import quote
# 先导入pip包，再加路径避免命名冲突
_barcode_pkg = __import__('barcode')
from barcode.writer import ImageWriter
from qrcode.image.pil import PilImage
from core.utils import generate_id
from core.database import get_by_id

router = APIRouter(prefix="/api/barcode", tags=["条码"])


def register(app):
    app.include_router(router)


@router.post("/generate")
def generate_barcode(body: dict):
    """生成条码图片（Code128）"""
    text = body.get("text", "")
    if not text:
        raise HTTPException(400, "text 不能为空")
    try:
        code128 = _barcode_pkg.get("code128", text, writer=ImageWriter())
        buf = io.BytesIO()
        code128.write(buf)
        safe_text = quote(text, safe='')[:50]
        return Response(
            content=buf.getvalue(),
            media_type="image/png",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{safe_text}.png"},
        )
    except Exception as e:
        raise HTTPException(500, f"条码生成失败: {e}")


@router.post("/qrcode")
def generate_qrcode(body: dict):
    """生成单个二维码"""
    text = body.get("text", "")
    if not text:
        raise HTTPException(400, "text 不能为空")
    try:
        img = qrcode.make(text, image_factory=PilImage)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        safe_text = quote(text, safe='')[:50]
        return Response(
            content=buf.getvalue(),
            media_type="image/png",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{safe_text}.png"},
        )
    except Exception as e:
        raise HTTPException(500, f"二维码生成失败: {e}")


@router.post("/qrcode/batch")
def generate_qrcode_batch(body: dict):
    """批量生成二维码 - 接收商品列表，返回zip包"""
    items = body.get("items", [])
    if not items:
        raise HTTPException(400, "items 不能为空")
    # 过滤空文本项
    items = [it for it in items if it.get("qr_text", "").strip()]
    if not items:
        raise HTTPException(400, "所有项均为空文本，无法生成")
    try:
        import zipfile
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for item in items:
                text = item.get("qr_text", "").strip()
                if not text:
                    continue
                filename = item.get("filename", f"{text}.png")
                if not filename.endswith(".png"):
                    filename += ".png"
                img = qrcode.make(text, image_factory=PilImage)
                img_buf = io.BytesIO()
                img.save(img_buf, format="PNG")
                zf.writestr(filename, img_buf.getvalue())

        buf.seek(0)
        return Response(
            content=buf.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=qrcodes.zip"}
        )
    except Exception as e:
        raise HTTPException(500, f"批量二维码生成失败: {e}")


@router.post("/qrcode/product/{pid}")
def generate_product_qrcode(pid: str, body: dict = {}):
    """生成单个商品二维码"""
    product = get_by_id("products", pid)
    if not product:
        raise HTTPException(404, "商品不存在")
    try:
        size = body.get("size", 300) if isinstance(body, dict) else 300
        qr_text = product.get("barcode") or product.get("sku") or pid
        if len(qr_text) > 2048:
            qr_text = qr_text[:2048]
        qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
        qr.add_data(qr_text)
        qr.make(fit=True)
        img = qr.make_image(image_factory=PilImage)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        filename = (product.get("name") or product.get("sku") or pid).replace('"', '')
        # RFC 5987 encoding for non-ASCII filenames
        from urllib.parse import quote
        safe_filename = quote(filename, safe='')[:80]
        return Response(
            content=buf.getvalue(),
            media_type="image/png",
            headers={
                "Content-Disposition": f"attachment; filename=\"qrcode.png\"; filename*=UTF-8''{safe_filename}.png",
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except Exception as e:
        raise HTTPException(500, f"二维码生成失败: {e}")
