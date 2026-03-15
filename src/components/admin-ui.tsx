"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { logoutAction } from "@/app/server-actions";
import { AppShell } from "@/components/shell";

const adminNavigation = [
  { href: "/admin", label: "الطلبات المعلقة", meta: "الرئيسية" },
  { href: "/admin/customers", label: "الزبائن والديون", meta: "إدارة" },
  { href: "/admin/settings", label: "الإعدادات", meta: "حسابات" },
  { href: "/admin/reports", label: "التقارير والتصدير", meta: "ملفات" },
];

export function AdminLayoutShell({
  title,
  subtitle,
  currentPath,
  children,
}: {
  title: string;
  subtitle: string;
  currentPath: string;
  children: ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <AppShell title={title} subtitle={subtitle}>
      <div className="mb-4 lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((value) => !value)}
          className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-brand hover:text-brand"
          aria-expanded={isMobileMenuOpen}
          aria-controls="admin-mobile-sidebar"
        >
          <span className="text-lg leading-none">{isMobileMenuOpen ? "×" : "≡"}</span>
          <span>{isMobileMenuOpen ? "إغلاق القائمة" : "القائمة"}</span>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside
          id="admin-mobile-sidebar"
          className={`${isMobileMenuOpen ? "block" : "hidden"} lg:sticky lg:top-6 lg:block`}
        >
          <section className="rounded-[1.75rem] border border-line bg-white/80 p-4 shadow-sm">
            <div className="border-b border-line pb-4">
              <p className="text-sm font-semibold text-brand">لوحة المدير</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">القائمة الرئيسية</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                تنقل سريع وثابت بين أقسام الإدارة بدون العودة للأعلى.
              </p>
            </div>

            <nav className="mt-4 grid gap-2">
              {adminNavigation.map((item) => {
                const active = currentPath === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`rounded-2xl px-4 py-3 transition ${
                      active
                        ? "bg-brand text-white shadow-[0_10px_24px_rgba(15,118,110,0.18)]"
                        : "bg-slate-50 text-slate-700 hover:bg-white hover:text-brand"
                    }`}
                  >
                    <p className={`text-xs ${active ? "text-white/80" : "text-slate-500"}`}>{item.meta}</p>
                    <p className="mt-1 text-sm font-bold">{item.label}</p>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 border-t border-line pt-4">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-brand hover:text-brand"
                >
                  تسجيل الخروج
                </button>
              </form>
            </div>
          </section>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </AppShell>
  );
}

export function AdminCardLink({
  href,
  title,
  text,
  meta,
}: {
  href: string;
  title: string;
  text: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[1.5rem] border border-line bg-white/80 p-5 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_12px_30px_rgba(15,118,110,0.10)]"
    >
      <p className="text-sm font-semibold text-brand">{meta}</p>
      <h3 className="mt-3 text-xl font-black text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
    </Link>
  );
}

export function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-line bg-white/65 p-5 md:p-6">
      <div className="mb-5 border-b border-line pb-4">
        <h2 className="text-xl font-black text-slate-900">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-base font-black text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

export function InlineMessage({ success, text }: { success: boolean; text: string }) {
  return (
    <div
      className={`mb-4 rounded-2xl px-4 py-3 text-sm ${
        success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
    >
      {text}
    </div>
  );
}

export function TextInput({
  name,
  label,
  placeholder,
  type = "text",
  defaultValue,
  required = true,
}: {
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required && name !== "note"}
        min={type === "number" ? 1 : undefined}
        className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-brand"
        placeholder={placeholder}
      />
    </label>
  );
}

export function SelectInput({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-brand"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

export const headerButtonClass =
  "rounded-2xl border border-line bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-brand hover:text-brand";

export const primaryButtonClass =
  "rounded-2xl bg-brand px-5 py-3 font-bold text-white transition hover:bg-[var(--brand-strong)]";

export const darkButtonClass =
  "rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-700";
