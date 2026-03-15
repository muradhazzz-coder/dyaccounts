import { createCreditRequestAction, logoutAction } from "@/app/server-actions";
import { AppShell, StatCard } from "@/components/shell";
import { requireCustomer } from "@/lib/auth";
import { getCustomerDashboardData } from "@/lib/db";
import { formatDate, formatIqd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CustomerPage() {
  const session = await requireCustomer();
  const data = getCustomerDashboardData(session.userId);

  if (!data) {
    return null;
  }

  return (
    <AppShell
      title={`مرحبًا ${data.customer.fullName}`}
      subtitle="يمكنك من هذه الصفحة طلب الرصيد، ومعرفة إجمالي دينك الحالي، والرجوع إلى كل عمليات الشراء والدفعات السابقة."
      actions={
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-brand hover:text-brand"
          >
            تسجيل الخروج
          </button>
        </form>
      }
    >
      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-line bg-white/70 p-5">
          <p className="text-sm text-slate-500">رقم الهاتف</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{data.customer.phone || "غير مضاف"}</p>
        </div>
        <div className="rounded-[1.5rem] border border-line bg-white/70 p-5">
          <p className="text-sm text-slate-500">الربيتر</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{data.customer.repeater || "غير مضاف"}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="إجمالي الدين الحالي" value={formatIqd(data.summary.currentDebt)} hint="هذا هو المبلغ المتبقي عليك بعد كل التسديدات." />
        <StatCard label="إجمالي الرصيد الموافق عليه" value={formatIqd(data.summary.totalApproved)} hint="كل طلب تمت الموافقة عليه يضاف إلى هذا المجموع." />
        <StatCard label="إجمالي ما تم تسديده" value={formatIqd(data.summary.totalPaid)} hint="يشمل الدفعات الجزئية والتصفير الكامل." />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-[1.75rem] border border-line bg-white/70 p-5 md:p-6">
          <h2 className="text-xl font-black text-slate-900">طلب رصيد جديد</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            أدخل فقط المبلغ المطلوب بالدينار العراقي، وسيظهر الطلب للمدير للموافقة أو الرفض.
          </p>
          <form action={createCreditRequestAction} className="mt-5 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">المبلغ المطلوب</span>
              <input
                name="amount"
                type="number"
                min={1}
                required
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-brand"
                placeholder="مثال: 25000"
              />
            </label>
            <button type="submit" className="w-full rounded-2xl bg-brand px-5 py-3 font-bold text-white transition hover:bg-[var(--brand-strong)]">
              إرسال الطلب
            </button>
          </form>
        </section>

        <section className="rounded-[1.75rem] border border-line bg-white/70 p-5 md:p-6">
          <h2 className="text-xl font-black text-slate-900">سجل الطلبات السابقة</h2>
          {data.requests.length === 0 ? (
            <EmptyState text="لا توجد طلبات سابقة حتى الآن." />
          ) : (
            <div className="mt-5 space-y-4">
              {data.requests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-black text-slate-900">{formatIqd(request.amount)}</p>
                      <p className="mt-1 text-sm text-slate-500">تاريخ الطلب: {formatDate(request.createdAt)}</p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    النوع: {request.source === "manual" ? "دين مباشر من المسؤول" : "طلب رصيد"}
                  </p>
                  {request.note ? <p className="mt-2 text-sm text-slate-600">ملاحظة: {request.note}</p> : null}
                  <p className="mt-3 text-sm text-slate-500">تاريخ المراجعة: {formatDate(request.reviewedAt)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-line bg-white/70 p-5 md:p-6">
        <h2 className="text-xl font-black text-slate-900">سجل الدفعات</h2>
        {data.payments.length === 0 ? (
          <EmptyState text="لا توجد دفعات مسجلة بعد." />
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {data.payments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-emerald-700">{formatIqd(payment.amount)}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatDate(payment.createdAt)}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    {payment.kind === "clear" ? "تصفير كامل" : "دفعة"}
                  </span>
                </div>
                {payment.note ? <p className="mt-3 text-sm text-slate-600">{payment.note}</p> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const details = {
    pending: { label: "قيد الانتظار", classes: "bg-amber-50 text-amber-700" },
    approved: { label: "تمت الموافقة", classes: "bg-emerald-50 text-emerald-700" },
    rejected: { label: "مرفوض", classes: "bg-rose-50 text-rose-700" },
  }[status as "pending" | "approved" | "rejected"] ?? {
    label: "قيد الانتظار",
    classes: "bg-amber-50 text-amber-700",
  };

  return <span className={`rounded-full px-3 py-2 text-sm font-bold ${details.classes}`}>{details.label}</span>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-line bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
