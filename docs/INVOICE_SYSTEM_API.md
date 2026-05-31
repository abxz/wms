# 发票管理系统对接 API 接口文档

> 版本：v1.0 · 预留接口 · 仅供后端实现参考
> WMS 2.0 仅存 `products.invoice_number` 字段，完整发票管理由独立系统接入

---

## 一、数据流

```
发票管理系统（未来）                    WMS 2.0
┌─────────────────┐              ┌──────────────────┐
│  创建发票        │─── POST ───→│  写入 invoice_no │
│  查询发票        │←── GET ────│  返回发票信息    │
│  出库同步开票    │←── POST ───│  出库完成通知    │
│  批量同步        │─── POST ───│  批量更新票号    │
└─────────────────┘              └──────────────────┘
```

## 二、接口定义

### 2.1 关联发票与产品

```http
POST /api/invoice-system/link
Content-Type: application/json

{
  "product_ids": ["a1b2c3", "d4e5f6"],
  "invoice_number": "INV-2026-0001"
}

Response 200:
{
  "success": true,
  "linked_count": 2,
  "failed_ids": []
}
```

### 2.2 批量同步发票号

```http
POST /api/invoice-system/sync
Content-Type: application/json

{
  "mappings": [
    {"product_id": "a1b2c3", "invoice_number": "INV-2026-0001"},
    {"product_id": "d4e5f6", "invoice_number": "INV-2026-0002"}
  ]
}

Response 200:
{
  "success": true,
  "synced": 2,
  "errors": []
}
```

### 2.3 出库完成通知（发票系统监听）

```http
POST /api/invoice-system/outbound-notify
Content-Type: application/json

{
  "order_no": "OUT-2026-0089",
  "items": [
    {"product_id": "a1b2c3", "product_name": "轴承", "quantity": 5, "invoice_number": "INV-2026-0001"},
    {"product_id": "d4e5f6", "product_name": "螺丝", "quantity": 10, "invoice_number": "INV-2026-0002"}
  ],
  "claimer": "张三",
  "department": "机加工车间",
  "timestamp": "2026-05-14T16:30:00+08:00"
}

Response 200:
{
  "success": true,
  "auto_invoiced": true,
  "invoice_ids": ["INV-2026-0001", "INV-2026-0002"]
}
```

## 三、注意事项

1. 发票管理系统接入前，WMS 仅存 `invoice_number` 文本字段，不做校验
2. 发票系统上线后，WMS 开启上述接口，`invoice_number` 变为关联 ID
3. 建议发票系统用 Webhook 接收出库通知（2.3），实现自动开票
4. 接口采用 REST + JSON，未来可扩展至 GraphQL
