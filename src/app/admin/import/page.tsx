import { requireAdmin } from "@/lib/auth";
import ImportCenter from "@/components/admin/ImportCenter";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  await requireAdmin();
  return (
    <div className="max-w-3xl">
      <header className="mb-5">
        <h1 className="menu-title text-2xl">مركز الاستيراد والتصدير</h1>
        <p className="text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
          المنيو كله بيتحمّل من هنا — ملف Excel واحد بأقسام وأصناف وأسعار وإضافات
        </p>
      </header>
      <ImportCenter />
    </div>
  );
}
