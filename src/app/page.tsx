import { redirect } from "next/navigation";
import { loginAction } from "@/app/server-actions";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();

  if (session?.role === "admin") {
    redirect("/admin");
  }

  if (session?.role === "customer") {
    redirect("/customer");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-line bg-panel-strong p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold text-brand">dyaccounts</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900">تسجيل الدخول</h1>
        </div>

        <form action={loginAction} className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">اسم المستخدم</span>
            <input
              name="username"
              type="text"
              required
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-brand"
              placeholder="ادخل اسم المستخدم"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">كلمة المرور</span>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-brand"
              placeholder="ادخل كلمة المرور"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-2xl bg-brand px-5 py-3 text-base font-bold text-white transition hover:bg-[var(--brand-strong)]"
          >
            دخول
          </button>
        </form>
      </section>
    </main>
  );
}
