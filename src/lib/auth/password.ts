import bcrypt from "bcryptjs";

const PASSWORD_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function validatePasswordStrength(password: string) {
  if (password.length < 8) {
    return "Das Passwort muss mindestens 8 Zeichen lang sein.";
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return "Das Passwort muss Gross- und Kleinbuchstaben sowie eine Zahl enthalten.";
  }

  return null;
}
