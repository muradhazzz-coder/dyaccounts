"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clearSession, createSession, requireAdmin, requireCustomer } from "@/lib/auth";
import {
  getAdminUser,
  getCustomerDebt,
  getUserById,
  getUserByUsername,
  runStatement,
} from "@/lib/db";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

function resolveAdminRedirect(formData: FormData, fallback = "/admin") {
  const redirectTo = formData.get("redirectTo");

  if (typeof redirectTo === "string" && redirectTo.startsWith("/admin")) {
    return redirectTo;
  }

  return fallback;
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.parse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  const user = getUserByUsername(parsed.username);

  if (!user || !(await bcrypt.compare(parsed.password, user.password_hash))) {
    redirect("/?error=invalid");
  }

  await createSession(user.id, user.role);
  redirect(user.role === "admin" ? "/admin" : "/customer");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function createCustomerAction(formData: FormData) {
  await requireAdmin();
  const redirectTo = resolveAdminRedirect(formData, "/admin/settings");

  const parsed = z
    .object({
      fullName: z.string().trim().min(2),
      username: z.string().trim().min(3),
      password: z.string().min(5),
      phone: z.string().trim().optional(),
      repeater: z.string().trim().optional(),
    })
    .parse({
      fullName: formData.get("fullName"),
      username: formData.get("username"),
      password: formData.get("password"),
      phone: formData.get("phone") || undefined,
      repeater: formData.get("repeater") || undefined,
    });

  if (getUserByUsername(parsed.username)) {
    redirect(`${redirectTo}?error=user-exists`);
  }

  runStatement(
    `
      INSERT INTO users (role, username, password_hash, full_name, phone, repeater)
      VALUES ('customer', ?, ?, ?, ?, ?)
    `,
    parsed.username,
    await bcrypt.hash(parsed.password, 10),
    parsed.fullName,
    parsed.phone ?? null,
    parsed.repeater ?? null,
  );

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  redirect(redirectTo);
}

export async function updateCustomerCredentialsAction(formData: FormData) {
  await requireAdmin();
  const redirectTo = resolveAdminRedirect(formData, "/admin/customers");

  const parsed = z
    .object({
      customerId: z.coerce.number().int().positive(),
      username: z.string().trim().min(3),
      newPassword: z.string().trim().optional(),
      phone: z.string().trim().optional(),
      repeater: z.string().trim().optional(),
    })
    .parse({
      customerId: formData.get("customerId"),
      username: formData.get("username"),
      newPassword: formData.get("newPassword") || undefined,
      phone: formData.get("phone") || undefined,
      repeater: formData.get("repeater") || undefined,
    });

  const customer = getUserById(parsed.customerId);
  if (!customer || customer.role !== "customer") {
    redirect(`${redirectTo}?customerCredentials=missing`);
  }

  const existing = getUserByUsername(parsed.username);
  if (existing && existing.id !== parsed.customerId) {
    redirect(`${redirectTo}?customerCredentials=username-exists`);
  }

  if (parsed.newPassword && parsed.newPassword.length < 5) {
    redirect(`${redirectTo}?customerCredentials=password-short`);
  }

  runStatement(
    `
      UPDATE users
      SET username = ?, phone = ?, repeater = ?
      WHERE id = ? AND role = 'customer'
    `,
    parsed.username,
    parsed.phone ?? null,
    parsed.repeater ?? null,
    parsed.customerId,
  );

  if (parsed.newPassword) {
    runStatement(
      `
        UPDATE users
        SET password_hash = ?
        WHERE id = ? AND role = 'customer'
      `,
      await bcrypt.hash(parsed.newPassword, 10),
      parsed.customerId,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  redirect(`${redirectTo}?customerCredentials=updated`);
}

export async function createCreditRequestAction(formData: FormData) {
  const session = await requireCustomer();
  const amount = z.coerce.number().int().positive().parse(formData.get("amount"));

  runStatement(
    `
      INSERT INTO credit_requests (customer_id, amount, status)
      VALUES (?, ?, 'pending')
    `,
    session.userId,
    amount,
  );

  revalidatePath("/customer");
  revalidatePath("/admin");
  redirect("/customer");
}

export async function addDirectDebtAction(formData: FormData) {
  const session = await requireAdmin();
  const redirectTo = resolveAdminRedirect(formData, "/admin/customers");
  const parsed = z
    .object({
      customerId: z.coerce.number().int().positive(),
      amount: z.coerce.number().int().positive(),
      note: z.string().trim().optional(),
    })
    .parse({
      customerId: formData.get("customerId"),
      amount: formData.get("amount"),
      note: formData.get("note") || undefined,
    });

  runStatement(
    `
      INSERT INTO credit_requests (
        customer_id,
        amount,
        status,
        source,
        note,
        reviewed_at,
        reviewed_by
      )
      VALUES (?, ?, 'approved', 'manual', ?, CURRENT_TIMESTAMP, ?)
    `,
    parsed.customerId,
    parsed.amount,
    parsed.note ?? "دين مباشر مضاف من المسؤول",
    session.userId,
  );

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  revalidatePath("/customer");
  redirect(`${redirectTo}?directDebt=created`);
}

export async function reviewRequestAction(formData: FormData) {
  const session = await requireAdmin();
  const redirectTo = resolveAdminRedirect(formData, "/admin");
  const parsed = z
    .object({
      requestId: z.coerce.number().int().positive(),
      decision: z.enum(["approved", "rejected"]),
    })
    .parse({
      requestId: formData.get("requestId"),
      decision: formData.get("decision"),
    });

  runStatement(
    `
      UPDATE credit_requests
      SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?
      WHERE id = ? AND status = 'pending'
    `,
    parsed.decision,
    session.userId,
    parsed.requestId,
  );

  revalidatePath("/admin");
  revalidatePath("/customer");
  redirect(redirectTo);
}

export async function recordPaymentAction(formData: FormData) {
  const session = await requireAdmin();
  const redirectTo = resolveAdminRedirect(formData, "/admin/customers");
  const parsed = z
    .object({
      customerId: z.coerce.number().int().positive(),
      amount: z.coerce.number().int().positive(),
      note: z.string().trim().optional(),
    })
    .parse({
      customerId: formData.get("customerId"),
      amount: formData.get("amount"),
      note: formData.get("note") || undefined,
    });

  runStatement(
    `
      INSERT INTO payments (customer_id, amount, kind, note, recorded_by)
      VALUES (?, ?, 'payment', ?, ?)
    `,
    parsed.customerId,
    parsed.amount,
    parsed.note ?? null,
    session.userId,
  );

  revalidatePath("/admin");
  revalidatePath("/customer");
  revalidatePath("/admin/customers");
  redirect(redirectTo);
}

export async function clearDebtAction(formData: FormData) {
  const session = await requireAdmin();
  const redirectTo = resolveAdminRedirect(formData, "/admin/customers");
  const customerId = z.coerce.number().int().positive().parse(formData.get("customerId"));
  const debt = getCustomerDebt(customerId);

  if (debt > 0) {
    runStatement(
      `
        INSERT INTO payments (customer_id, amount, kind, note, recorded_by)
        VALUES (?, ?, 'clear', ?, ?)
      `,
      customerId,
      debt,
      "تصفير كامل للدين",
      session.userId,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/customer");
  revalidatePath("/admin/customers");
  redirect(redirectTo);
}

export async function changeAdminPasswordAction(formData: FormData) {
  const session = await requireAdmin();
  const redirectTo = resolveAdminRedirect(formData, "/admin/settings");
  const parsed = z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(5),
      confirmPassword: z.string().min(5),
    })
    .parse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });

  if (parsed.newPassword !== parsed.confirmPassword) {
    redirect(`${redirectTo}?passwordError=mismatch`);
  }

  const admin = getAdminUser();
  if (!admin || admin.id !== session.userId) {
    redirect(`${redirectTo}?passwordError=missing`);
  }

  const passwordMatches = await bcrypt.compare(parsed.currentPassword, admin.password_hash);
  if (!passwordMatches) {
    redirect(`${redirectTo}?passwordError=invalid-current`);
  }

  runStatement(
    `
      UPDATE users
      SET password_hash = ?
      WHERE id = ? AND role = 'admin'
    `,
    await bcrypt.hash(parsed.newPassword, 10),
    session.userId,
  );

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  redirect(`${redirectTo}?passwordSuccess=1`);
}
