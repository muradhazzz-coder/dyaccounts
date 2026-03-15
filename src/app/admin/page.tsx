import { reviewRequestAction } from "@/app/server-actions";
import {
  AdminCardLink,
  AdminLayoutShell,
  EmptyState,
  Panel,
} from "@/components/admin-ui";
import { StatCard } from "@/components/shell";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/db";
import { formatDate, formatIqd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const data = getAdminDashboardData();

  return (
    <AdminLayoutShell
      title="الطلبات المعلقة"
      subtitle="هذه هي الصفحة الرئيسية الآن. راقب الطلبات الجديدة بسرعة، وانتقل لباقي الوظائف من خلال البطاقات أدناه."
      currentPath="/admin"
    >
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="طلبات بانتظارك"
          value={String(data.totals.pendingCount)}
          hint="أي طلب جديد سيظهر هنا مباشرة للمراجعة السريعة."
        />
        <StatCard
          label="إجمالي الديون الحالية"
          value={formatIqd(data.totals.totalDebt)}
          hint="يمكنك إدارة التفاصيل الكاملة من صفحة الزبائن والديون."
        />
        <StatCard
          label="عدد الزبائن"
          value={String(data.totals.totalCustomers)}
          hint="إدارة الحسابات وبيانات الدخول أصبحت في صفحة مستقلة."
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <AdminCardLink
          href="/admin/customers"
          meta="إدارة مفصلة"
          title="الزبائن والديون"
          text="ابحث عن الزبائن، صفِّ النتائج، سجّل دفعات، صفّر الدين، وعدّل اسم المستخدم أو كلمة المرور."
        />
        <AdminCardLink
          href="/admin/settings"
          meta="إعدادات"
          title="الحسابات والإعدادات"
          text="أضف زبونًا جديدًا وغيّر كلمة مرور المدير من صفحة مستقلة ومركزة."
        />
        <AdminCardLink
          href="/admin/reports"
          meta="تقارير"
          title="التصدير والتسديدات"
          text="استعرض أحدث التسديدات ونزّل النسخة الاحتياطية أو ملفات Excel وPDF."
        />
      </section>

      <section className="mt-8">
        <Panel
          title="قائمة الطلبات المعلقة"
          description="واجهة مختصرة للموافقة أو الرفض دون تشتيت بوظائف أخرى."
        >
          {data.pendingRequests.length === 0 ? (
            <EmptyState text="لا توجد طلبات معلقة حاليًا." />
          ) : (
            <div className="space-y-4">
              {data.pendingRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{request.customerName}</h3>
                      <p className="text-sm text-slate-500">@{request.customerUsername}</p>
                    </div>
                    <div className="rounded-full bg-amber-50 px-4 py-2 text-lg font-black text-amber-700">
                      {formatIqd(request.amount)}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">تاريخ الطلب: {formatDate(request.createdAt)}</p>
                  <div className="mt-4 flex gap-3">
                    <form action={reviewRequestAction} className="flex-1">
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <input type="hidden" name="redirectTo" value="/admin" />
                      <button type="submit" className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-700">
                        موافقة
                      </button>
                    </form>
                    <form action={reviewRequestAction} className="flex-1">
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <input type="hidden" name="redirectTo" value="/admin" />
                      <button type="submit" className="w-full rounded-2xl bg-rose-600 px-4 py-3 font-bold text-white transition hover:bg-rose-700">
                        رفض
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </AdminLayoutShell>
  );
}
