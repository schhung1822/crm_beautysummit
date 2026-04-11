import bcrypt from "bcryptjs";

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify password
 */
export async function verifyPassword(password: string, hashedPassword: string | null | undefined): Promise<boolean> {
  if (!hashedPassword) {
    return false;
  }

  return bcrypt.compare(password, hashedPassword);
}
