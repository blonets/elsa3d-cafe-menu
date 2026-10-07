"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "حدث خطأ — جرب تاني");
        setBusy(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالسيرفر");
      setBusy(false);
    }
  };

  return (
    <div className="admin-bg min-h-dvh flex items-center justify-center px-4" dir="rtl">
      <div className="card w-full max-w-sm p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-mark.png" alt="Elsa3d Cafe" className="w-20 h-20 mx-auto rounded-full" />
        <h1 className="menu-title text-xl mt-4">لوحة تحكم المنيو</h1>
        <p className="text-[13px] mt-1 mb-6" style={{ color: "var(--ink-faint)" }}>
          كافيه السعد — دخول الأدمن فقط
        </p>

        <form onSubmit={submit} className="space-y-3 text-start">
          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">اسم المستخدم</span>
            <div className="relative">
              <User size={15} className="absolute top-1/2 -translate-y-1/2 start-3 opacity-40" />
              <input
                className="inp !ps-9"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>
          </label>
          <label className="block">
            <span className="text-[12.5px] font-bold mb-1 block">كلمة السر</span>
            <div className="relative">
              <Lock size={15} className="absolute top-1/2 -translate-y-1/2 start-3 opacity-40" />
              <input
                type="password"
                className="inp !ps-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          {error && (
            <p className="text-[13px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" className="btn btn-primary w-full !py-2.5" disabled={busy}>
            {busy ? "بيسجل…" : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
