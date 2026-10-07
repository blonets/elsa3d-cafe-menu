# Elsa3d Cafe — QR Menu System (كافيه السعد)

نظام منيو إلكتروني ثنائي اللغة (عربي/إنجليزي) مع QR للترابيزات ولوحة تحكم كاملة — مبني خصيصاً لكافيه السعد ومهيأ للنشر على Dokploy.

| | |
|---|---|
| منيو العملاء | https://menu.elsa3dcafe.com |
| لوحة التحكم | https://adminmenueg.elsa3dcafe.com |
| المشروع في Dokploy | `CafeAndResturantsSystems` → خدمة `menu_ELsa3dCafe` |

## المكوّنات

- **Next.js 15** (App Router, TypeScript) — تطبيق واحد يخدم الدومينين عبر middleware:
  - `menu.elsa3dcafe.com` → المنيو العام (صفحات ثابتة ISR + revalidateTag لحظي)
  - `adminmenueg.elsa3dcafe.com` → لوحة التحكم (محمية)
- **PostgreSQL 16 + Drizzle ORM** — داخل الـ compose، بدون أي منفذ مكشوف للإنترنت.
- **مركز استيراد/تصدير XLSX** — خط حياة البيانات: الكتالوج كله بيدخل من ملف Excel واحد (دمج / استبدال / فحص تجريبي / تراجع).
- **مركز QR** — رمز أساسي + رموز تربيزات ZIP + ورقة طباعة، باللوجو في النص.
- **تحليلات خفيفة** — مسحات QR (برقم التربيزة)، مشاهدات أصناف، بحث — بدون كوكيز وبدون PII.

## البنية

```
src/
  app/menu/          صفحة المنيو العامة (static)
  app/print/         نسخة الطباعة PDF
  app/admin/         لوحة التحكم (10 صفحات)
  app/api/           availability · analytics · health · admin/*
  components/        واجهة المنيو التفاعلية + مكونات البانل
  lib/import/        محرك الاستيراد (parse / apply / template)
  lib/actions/       server actions (items / catalog / settings)
  db/schema.ts       مخطط قاعدة البيانات
drizzle/             ملفات الـ migrations (تُطبَّق تلقائياً عند تشغيل الحاوية)
public/brand/        أصول البراند المولدة (logo, favicon, og-image)
public/fonts/        خطوط self-hosted (Cairo, Inter, Amiri)
scripts/             توليد الأصول + الخطوط + migrate + fixture
```

## التشغيل محلياً

```bash
npm install
cp .env.example .env.local        # عدّل القيم
npm run db:push                   # أو DATABASE_URL=... node scripts/migrate.mjs
npm run dev                       # http://localhost:3000 → /menu و /admin
```

## التوثيق

- [DEPLOYMENT.md](DEPLOYMENT.md) — النشر على Dokploy والنطاقات والنسخ الاحتياطي.
- [ADMIN-GUIDE.md](ADMIN-GUIDE.md) — دليل الاستخدام اليومي بالعربي.
- [DATA-FORMAT.md](DATA-FORMAT.md) — عقد ملف الاستيراد XLSX (المرجع لتجهيز الكتالوج الحقيقي).
- `sample-import.xlsx` — بيانات تجريبية (12 صنف) لاختبار النظام كاملاً.

## قواعد ثابتة

- قاعدة البيانات تُشحن **فاضية من الكتالوج** — البيانات الحقيقية تدخل فقط عبر مركز الاستيراد.
- المنيو نصي بالكامل — لا صور منتجات.
- كل بيانات حساسة → متغيرات بيئة فقط. المستخدم الأدمن واحد فقط.
