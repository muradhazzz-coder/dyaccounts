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
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-line bg-panel p-8 shadow-[0_20px_80px_rgba(120,53,15,0.10)] backdrop-blur md:p-10">
          <div className="mb-10 inline-flex items-center rounded-full border border-amber-700/15 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            dyaccounts - منصة إدارة الديون والرصيد بالدينار العراقي
          </div>
          <h1 className="max-w-2xl text-4xl font-black leading-[1.4] text-slate-900 md:text-5xl">
            راقب طلبات الزبائن، وافق عليها، وتابع الديون والتسديدات من مكان واحد.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-9 text-slate-700">
            التطبيق ينظم طلبات الرصيد بالآجل، ويعرض إجمالي الديون الحالية، وسجل
            المشتريات السابقة، وسجل الدفعات المسجلة لكل زبون.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <FeatureCard title="طلبات مباشرة" text="الزبون يطلب المبلغ، وأنت توافق أو ترفض من لوحة التحكم." />
            <FeatureCard title="ديون دقيقة" text="حساب تلقائي لإجمالي الديون الحالية لكل زبون." />
            <FeatureCard title="سجل دفعات" text="إضافة دفعات جزئية أو تصفير كامل للدين مع حفظ السجل." />
          </div>
        </section>

        <section className="rounded-[2rem] border border-line bg-panel-strong p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="mb-8">
            <p className="text-sm font-semibold text-brand">تسجيل الدخول</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">ابدأ من هنا</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              المدير الافتراضي عند أول تشغيل:
              <span className="mx-1 font-bold">admin</span>
              /
              <span className="mx-1 font-bold">admin12345</span>
            </p>
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
      </div>
    </main>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/75 p-5">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
    </div>
  );
}
