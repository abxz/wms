"""条码/二维码生成模块"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import io, os, json
import qrcode
import sys
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
        code128 = barcode.get("code128", text, writer=ImageWriter())
        buf = io.BytesIO()
        code128.write(buf)
        return Response(content=buf.getvalue(), media_type="image/png")
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
        return Response(content=buf.getvalue(), media_type="image/png")
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
def generate_product_qrcode(pid: str):
    """生成单个商品二维码（含商品信息）"""
    product = get_by_id("products.json", pid)
    if not product:
        raise HTTPException(404, "商品不存在")
    try:
        qr_text = f"{product['name']}|{product.get('sku','')}|{pid}"
        if len(qr_text) > 2048:
            qr_text = f"{product.get('sku', pid)}|{pid}"[:2048]
        img = qrcode.make(qr_text, image_factory=PilImage)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return Response(
            content=buf.getvalue(),
            media_type="image/png",
            headers={"Content-Disposition": f"attachment; filename={product.get('sku', pid)}.png"}
        )
    except Exception as e:
        raise HTTPException(500, f"二维码生成失败: {e}")
