import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  checkCredentials,
  checkRateLimit,
  recordLoginFailure,
  recordLoginSuccess,
  clientIp,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const body = z.object({
  username: z.string().min(1).max(60),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `محاولات كثيرة — حرب تاني بعد ${rl.retryAfterSec} ثانية` },
      { status: 429 },
    );
  }

  let parsedBody: z.infer<typeof body>;
  try {
    parsedBody = body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const ok = await checkCredentials(parsedBody.username, parsedBody.password);
  if (!ok) {
    recordLoginFailure(ip);
    await writeAudit({
      action: "auth.login_failed",
      entityType: "auth",
      summary: `محاولة دخول فاشلة من ${ip}`,
    }).catch(() => {});
    return NextResponse.json({ error: "اسم المستخدم أو كلمة السر غير صحيحة" }, { status: 401 });
  }

  recordLoginSuccess(ip);
  const token = await createSessionToken();
  await setSessionCookie(token);
  await writeAudit({
    action: "auth.login",
    entityType: "auth",
    summary: `تسجيل دخول ناجح من ${ip}`,
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
