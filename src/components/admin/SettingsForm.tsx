"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Save } from "lucide-react";
import { updateBrandInfo, changePassword } from "@/lib/actions/settings";

type S = { cafeNameAr: string; cafeNameEn: string; phone: string; whatsapp: string; currencyLabel: string };

export default function SettingsForm({ settings }: { settings: S }) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState("");
  const [pending, startTransition] = useTransition();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    const res = await updateBrandInfo(form);
    if (res.ok) {
      setSaved("تم الحفظ ✓");
      setTimeout(() => setSaved(""), 2500);
      startTransition(() => router.refresh());
    }
  };

  const changePw = async () => {
    if (pw.next !== pw.confirm) {
      setPwMsg({ ok: false, text: "كلمتين السر مش متطابقين" });
      return;
    }
    const res = await changePassword({ currentPassword: pw.current, newPassword: pw.next });
    if (res.ok) {
      setPwMsg({ ok: true, text: "اتغيرت كلمة السر ✓" });
      setPw({ current: "", next: "", confirm: "" });
    } else {
      setPwMsg({ ok: false, text: res.error ?? "فشل التغيير" });
    }
  };

  return (
    <div className="space-y-4">
      <section className="card p-5 space-y-4">
        <h2 className="font-extrabold text-[15px]">بيانات البراند</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">الاسم بالعربي</span>
            <input className="inp" value={form.cafeNameAr} onChange={(e) => setForm({ ...form, cafeNameAr: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">الاسم بالإنجليزي</span>
            <input className="inp" dir="ltr" value={form.cafeNameEn} onChange={(e) => setForm({ ...form, cafeNameEn: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">رقم الهاتف (يظهر للعملاء)</span>
            <input className="inp" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">واتساب (بالصيغة الدولية بدون +)</span>
            <input className="inp" dir="ltr" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">رمز العملة</span>
            <input className="inp !w-24" value={form.currencyLabel} onChange={(e) => setForm({ ...form, currencyLabel: e.target.value })} />
          </label>
        </div>
        <button onClick={save} disabled={pending} className="btn btn-primary btn-sm">
          <Save size={13} /> حفظ
        </button>
        {saved && <p className="text-[13px] font-bold text-green-600">{saved}</p>}
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-extrabold text-[15px] flex items-center gap-2">
          <KeyRound size={15} /> تغيير كلمة سر الأدمن
        </h2>
        <input
          type="password"
          className="inp"
          placeholder="كلمة السر الحالية"
          value={pw.current}
          onChange={(e) => setPw({ ...pw, current: e.target.value })}
          autoComplete="current-password"
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            type="password"
            className="inp"
            placeholder="كلمة السر الجديدة (8 أحرف+)"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
            autoComplete="new-password"
          />
          <input
            type="password"
            className="inp"
            placeholder="تأكيد كلمة السر"
            value={pw.confirm}
            onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            autoComplete="new-password"
          />
        </div>
        <button onClick={changePw} className="btn btn-ghost btn-sm">
          تغيير كلمة السر
        </button>
        {pwMsg && <p className={`text-[13px] font-bold ${pwMsg.ok ? "text-green-600" : "text-red-600"}`}>{pwMsg.text}</p>}
      </section>
    </div>
  );
}
