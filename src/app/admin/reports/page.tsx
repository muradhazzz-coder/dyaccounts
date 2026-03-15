import Link from "next/link";
import {
  AdminLayoutShell,
  EmptyState,
  Panel,
  headerButtonClass,
} from "@/components/admin-ui";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/db";
import { formatDate, formatIqd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireAdmin();
  const data = getAdminDashboardData();

  return (
    <AdminLayoutShell
      title="التقارير والتصدير"
      subtitle="هنا ستجد سجل أحدث التسديدات وروابط النسخ الاحتياطية والتصدير حتى لا تزاحم الصفحة الرئيسية."
      currentPath="/admin/reports"
    >
      <section className="grid gap-4 md:grid-cols-3">
        <Link href="/api/exports/backup" className={headerButtonClass}>
          تنزيل نسخة احتياطية JSON
        </Link>
        <Link href="/api/exports/excel" className={headerButtonClass}>
          تصدير كل السجلات إلى Excel
        </Link>
        <Link href="/api/exports/pdf" className={headerButtonClass}>
          تصدير ملخص PDF
        </Link>
      </section>

      <section className="mt-6">
        <Panel
          title="أحدث التسديدات"
          description="سجل سريع لآخر العمليات المالية المسجلة على حسابات الزبائن."
        >
          {data.recentPayments.length === 0 ? (
            <EmptyState text="لا توجد دفعات مسجلة حتى الآن." />
          ) : (
            <div className="space-y-3">
              {data.recentPayments.map((payment) => (
                <div key={payment.id} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{payment.customerName}</p>
                      <p className="text-sm text-slate-500">{formatDate(payment.createdAt)}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-emerald-700">{formatIqd(payment.amount)}</p>
                      <p className="text-xs text-slate-500">
                        {payment.kind === "clear" ? "تصفير كامل" : "دفعة جزئية"}
                      </p>
                    </div>
                  </div>
                  {payment.note ? <p className="mt-3 text-sm text-slate-600">{payment.note}</p> : null}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </AdminLayoutShell>
  );
}
