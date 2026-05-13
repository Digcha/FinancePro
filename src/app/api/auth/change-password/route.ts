import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Bitte melden Sie sich erneut an." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    currentPassword?: string;
    newPassword?: string;
  } | null;
  const newPassword = payload?.newPassword ?? "";
  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) {
    return NextResponse.json({ error: strengthError }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "Benutzer wurde nicht gefunden." }, { status: 404 });
  }

  if (!user.mustChangePassword) {
    const currentPassword = payload?.currentPassword ?? "";
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Aktuelles Passwort ist nicht korrekt." }, { status: 401 });
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false
    }
  });

  return NextResponse.json({
    ok: true,
    redirectTo: user.role === "SUPER_ADMIN" ? "/admin" : "/app/inbox"
  });
}
