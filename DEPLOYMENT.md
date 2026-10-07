# DEPLOYMENT — Elsa3d Cafe QR Menu

النظام منشور على Dokploy على السيرفر `89.58.55.187` كمشروع `CafeAndResturantsSystems` → خدمة Docker Compose باسم `menu_ELsa3dCafe`.

## 1. الخدمات في الـ Compose

| الخدمة | الدور | منافذ |
|---|---|---|
| `app` | Next.js 15 (standalone) — migrations تلقائية عند الإقلاع | 3000 داخلي فقط |
| `db` | PostgreSQL 16 + volume `pgdata` | **بدون منافذ منشورة** (شبكة داخلية) |
| `backup` | pg_dump يومي إلى volume `backups` (آخر 14 نسخة) | — |

شبكة `dokploy-network` (external) موصولة بـ `app` فقط — هي اللي بيمرّ عليها Traefik.

## 2. متغيرات البيئة (تتظبط في Dokploy → Environment)

| المتغير | الوصف |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | بيانات قاعدة البيانات |
| `DATABASE_URL` | `postgresql://user:pass@db:5432/elsa3d_menu` |
| `ADMIN_USERNAME` | اسم مستخدم الأدمن (افتراضي `admin`) |
| `ADMIN_PASSWORD` | كلمة سر الأدمن — تُشفَّر bcrypt عند أول إقلاع ولا تُخزَّن خام |
| `AUTH_SECRET` | مفتاح توقيع الجلسات (`openssl rand -hex 32`) |
| `MENU_DOMAIN` | `https://menu.elsa3dcafe.com` |
| `ADMIN_DOMAIN` | `https://adminmenueg.elsa3dcafe.com` |
| `CAFE_NAME_AR/EN`, `CAFE_PHONE`, `CAFE_WHATSAPP` | بيانات البراند الأولية |

## 3. النطاقات و DNS

سجلات A على Cloudflare (zone `elsa3dcafe.com`) — **DNS only** (نفس نمط `pos.elsa3dcafe.com`):

| الاسم | المحتوى | Proxy |
|---|---|---|
| `menu` | 89.58.55.187 | false |
| `adminmenueg` | 89.58.55.187 | false |

TLS: شهادات Let's Encrypt بتديرها Traefik في Dokploy (certresolver `letsencrypt`) — HTTP-01 عبر البورت 80.

> لو حبيت تفعّل بروكسي Cloudflare (السحابة البرتقالية) لاحقاً: اشغّلها واتأكد إن SSL/TLS mode = **Full** — النظام بيقرأ IP العميل من `CF-Connecting-IP` تلقائياً.

## 4. العزل الأمني

- أي مسار `/admin` أو `/api/admin` على دومين المنيو → **404** (مش redirect).
- كوكي الجلسة host-only على `adminmenueg.elsa3dcafe.com` — مش بيتبعت للمنيو أبداً.
- Rate limit على تسجيل الدخول: 5 محاولات/دقيقة ← قفل تصاعدي، وكل محاولة مسجلة في سجل العمليات.
- قاعدة البيانات غير قابلة للوصول من الخارج نهائياً.

## 5. النسخ الاحتياطي والاستعادة

**النسخ:** خدمة `backup` بتعمل `pg_dump -Fc` يومياً في volume `backups` باسم `elsa3d_menu_YYYYMMDD-HHMM.dump` (بيحتفظ بآخر 14).

**الاستعادة (يدوياً عبر SSH):**

```bash
# 1) انسخ النسخة من الـ volume
docker run --rm -v <project>_backups:/b -v /tmp:/out alpine cp /b/elsa3d_menu_XXXX.dump /out/

# 2) استعدها في قاعدة جديدة (أو فوق الحالية بعد تفريغها)
docker exec -i <project>_db-1 pg_restore -U menu_user -d elsa3d_menu --clean --if-exists < /tmp/elsa3d_menu_XXXX.dump

# 3) أعد تشغيل التطبيق
```

كمان في تصدير/استيراد XLSX كامل من البانل — يستخدم كنسخة احتياطية بشرية في أي وقت.

## 6. تحديث النظام

أي push على `main` في الريبو → في Dokploy افتح الخدمة `menu_ELsa3dCafe` → **Deploy**.
الـ migrations بتتطبق تلقائياً عند إقلاع الحاوية قبل تشغيل السيرفر (`node scripts/migrate.mjs && node server.js`).

## 7. استكشاف الأخطاء

| المشكلة | الفحص |
|---|---|
| الصفحة مش بتفتح | `ssh root@89.58.55.187 "docker ps | grep menu"` — الحاوية healthy؟ |
| شهادة TLS | `docker logs dokploy-traefik --tail 50 | grep -i acme` |
| تطبيق | logs الحاوية `app` من Dokploy أو `docker logs <project>-app-1` |
| قاعدة البيانات | `docker exec <project>_db-1 pg_isready -U menu_user` |
| فحص صحة | `curl https://menu.elsa3dcafe.com/api/health` → `{"status":"ok"}` |
