import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById, type UserRole } from "@/lib/db";

const cookieName = "dyaccounts_session";
const sessionSecret =
  process.env.SESSION_SECRET ?? "dyaccounts-local-secret-change-me";

function sign(value: string) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("hex");
}

export async function createSession(userId: number, role: UserRole) {
  const payload = `${userId}:${role}`;
  const token = `${payload}:${sign(payload)}`;
  const cookieStore = await cookies();

  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (!token) {
    return null;
  }

  const [userIdText, role, signature] = token.split(":");
  const payload = `${userIdText}:${role}`;

  if (!userIdText || !role || !signature || sign(payload) !== signature) {
    return null;
  }

  const userId = Number(userIdText);
  if (!Number.isInteger(userId) || (role !== "admin" && role !== "customer")) {
    return null;
  }

  const user = getUserById(userId);
  if (!user || user.role !== role) {
    return null;
  }

  return { userId, role: role as UserRole };
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/");
  }

  return session;
}

export async function requireCustomer() {
  const session = await getSession();
  if (!session || session.role !== "customer") {
    redirect("/");
  }

  return session;
}
