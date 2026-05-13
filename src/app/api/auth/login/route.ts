import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { login?: string; password?: string } | null;
  const login = payload?.login?.trim().toLowerCase();
  const password = payload?.password ?? "";

  if (!login || !password) {
    return NextResponse.json({ error: "Bitte Benutzername/E-Mail und Passwort eingeben." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: login }, { username: login }]
    },
    include: { tenant: true }
  });

  if (!user || user.status !== "active" || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Login fehlgeschlagen. Bitte Zugangsdaten prüfen." }, { status: 401 });
  }

  if (user.role !== "SUPER_ADMIN" && (!user.tenant || user.tenant.status !== "active")) {
    return NextResponse.json({ error: "Diese Firma ist aktuell nicht aktiv." }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });
  await setSessionCookie(user.id);

  return NextResponse.json({
    ok: true,
    redirectTo: user.mustChangePassword ? "/change-password" : user.role === "SUPER_ADMIN" ? "/admin" : "/app/inbox"
  });
}
