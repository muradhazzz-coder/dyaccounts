import {
  addDirectDebtAction,
  clearDebtAction,
  deleteCustomerOperationAction,
  recordPaymentAction,
  updateCustomerCredentialsAction,
} from "@/app/server-actions";
import {
  AdminLayoutShell,
  EmptyState,
  InlineMessage,
  MiniStat,
  Panel,
  SelectInput,
  SubSection,
  TextInput,
  darkButtonClass,
  primaryButtonClass,
} from "@/components/admin-ui";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardData, getCustomerOperationHistory } from "@/lib/db";
import { formatDate, formatIqd } from "@/lib/format";

export const dynamic = "force-dynamic";

type CustomersPageProps = {
  searchParams?: Promise<{
    q?: string;
    filter?: string;
    customerCredentials?: string;
    directDebt?: string;
    operationDeleted?: string;
    paymentError?: string;
  }>;
};

export default async function AdminCustomersPage({ searchParams }: CustomersPageProps) {
  await requireAdmin();
  const data = getAdminDashboardData();
  const params = (await searchParams) ?? {};
  const searchText = (params.q ?? "").trim().toLowerCase();
  const filter = params.filter ?? "all";

  const customers = data.customers.filter((customer) => {
    const matchesSearch =
      !searchText ||
      customer.fullName.toLowerCase().includes(searchText) ||
      customer.username.toLowerCase().includes(searchText);

    const matchesFilter =
      filter === "all" ||
      (filter === "has-debt" && customer.currentDebt > 0) ||
      (filter === "clear" && customer.currentDebt <= 0) ||
      (filter === "pending" && customer.pendingRequests > 0);

    return matchesSearch && matchesFilter;
  });

  const message =
    params.customerCredentials === "updated"
      ? "تم تحديث بيانات دخول الزبون بنجاح."
      : params.customerCredentials === "username-exists"
        ? "اسم المستخدم مستخدم مسبقًا لزبون آخر."
        : params.customerCredentials === "password-short"
          ? "كلمة المرور الجديدة يجب أن تكون 5 أحرف على الأقل."
          : params.directDebt === "created"
            ? "تمت إضافة دين مباشر على الزبون بنجاح."
          : params.operationDeleted === "1"
            ? "تم حذف العملية بنجاح."
          : params.paymentError === "no-debt"
            ? "لا يمكن تسجيل دفعة لأن هذا الزبون لا يملك دينًا حاليًا."
          : params.paymentError === "exceeds-debt"
            ? "لا يمكن تسجيل دفعة أكبر من الدين الحالي لأن ذلك سيجعل الحساب سالبًا."
          : null;

  const isSuccessMessage =
    params.customerCredentials === "updated" ||
    params.directDebt === "created" ||
    params.operationDeleted === "1";

  return (
    <AdminLayoutShell
      title="الزبائن والديون"
      subtitle="كل ما يتعلق بالزبائن موجود هنا: البحث، التصفية، إدارة الدين، وتعديل بيانات الدخول."
      currentPath="/admin/customers"
    >
      <Panel
        title="بحث وتصفية"
        description="استخدم البحث أو عامل التصفية لتقليل القائمة والوصول بسرعة إلى الزبون المطلوب."
      >
        {message ? <InlineMessage success={isSuccessMessage} text={message} /> : null}
        <form className="grid gap-3 rounded-[1.5rem] border border-line bg-slate-50 p-4 md:grid-cols-[1.2fr_0.8fr_auto]">
          <TextInput
            name="q"
            type="search"
            label="بحث عن زبون"
            placeholder="ابحث بالاسم أو اسم المستخدم"
            defaultValue={params.q ?? ""}
            required={false}
          />
          <SelectInput
            name="filter"
            label="تصفية"
            defaultValue={filter}
            options={[
              { value: "all", label: "الكل" },
              { value: "has-debt", label: "عليه دين" },
              { value: "clear", label: "بدون دين" },
              { value: "pending", label: "لديه طلبات معلقة" },
            ]}
          />
          <button type="submit" className={`self-end ${primaryButtonClass}`}>
            تطبيق
          </button>
        </form>
      </Panel>

      <section className="mt-6">
        {customers.length === 0 ? (
          <EmptyState text="لا توجد نتائج مطابقة للبحث أو التصفية الحالية." />
        ) : (
          <div className="space-y-5">
            {customers.map((customer) => (
              <CustomerPanel key={customer.id} customer={customer} />
            ))}
          </div>
        )}
      </section>
    </AdminLayoutShell>
  );
}

function CustomerPanel({
  customer,
}: {
  customer: Awaited<ReturnType<typeof getAdminDashboardData>>["customers"][number];
}) {
  const operations = getCustomerOperationHistory(customer.id);

  return (
    <Panel
      title={customer.fullName}
      description={`@${customer.username} - أضيف بتاريخ ${formatDate(customer.createdAt)}`}
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <MiniStat label="الدين الحالي" value={formatIqd(customer.currentDebt)} />
        <MiniStat label="الموافق عليه" value={formatIqd(customer.totalApproved)} />
        <MiniStat label="المدفوع" value={formatIqd(customer.totalPaid)} />
        <MiniStat label="طلبات معلقة" value={String(customer.pendingRequests)} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-slate-50 p-4">
          <p className="text-sm text-slate-500">رقم الهاتف</p>
          <p className="mt-2 text-base font-bold text-slate-900">{customer.phone || "غير مضاف"}</p>
        </div>
        <div className="rounded-2xl border border-line bg-slate-50 p-4">
          <p className="text-sm text-slate-500">الربيتر</p>
          <p className="mt-2 text-base font-bold text-slate-900">{customer.repeater || "غير مضاف"}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SubSection title="العمليات المالية">
          <div className="grid gap-4">
            <form action={addDirectDebtAction} className="grid gap-3 rounded-2xl border border-line bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="customerId" value={customer.id} />
              <input type="hidden" name="redirectTo" value="/admin/customers" />
              <TextInput
                name="amount"
                type="number"
                label="إضافة دين مباشر"
                placeholder="مبلغ دين سابق أو تحويل خارجي"
              />
              <TextInput name="note" label="سبب الدين" placeholder="مثال: تحويل خارجي" required={false} />
              <button type="submit" className={primaryButtonClass}>
                إضافة الدين
              </button>
            </form>

            <form action={recordPaymentAction} className="grid gap-3 rounded-2xl border border-line bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="customerId" value={customer.id} />
              <input type="hidden" name="redirectTo" value="/admin/customers" />
              <TextInput
                name="amount"
                type="number"
                label="تسديد مبلغ"
                placeholder={`الحد الأقصى ${formatIqd(Math.max(customer.currentDebt, 0))}`}
              />
              <TextInput name="note" label="ملاحظة" placeholder="اختياري" />
              <button type="submit" className={`self-end ${darkButtonClass}`}>
                تسجيل الدفعة
              </button>
            </form>

            <form action={clearDebtAction}>
              <input type="hidden" name="customerId" value={customer.id} />
              <input type="hidden" name="redirectTo" value="/admin/customers" />
              <button type="submit" className="w-full rounded-2xl bg-amber-600 px-5 py-3 font-bold text-white transition hover:bg-amber-700">
                تصفير الدين بالكامل
              </button>
            </form>
          </div>
        </SubSection>

        <SubSection title="بيانات الدخول">
          <form action={updateCustomerCredentialsAction} className="grid gap-3 rounded-2xl border border-line bg-slate-50 p-4">
            <input type="hidden" name="customerId" value={customer.id} />
            <input type="hidden" name="redirectTo" value="/admin/customers" />
            <TextInput
              name="username"
              label="اسم المستخدم"
              placeholder="اسم المستخدم"
              defaultValue={customer.username}
            />
            <TextInput
              name="phone"
              label="رقم الهاتف"
              placeholder="رقم الهاتف"
              defaultValue={customer.phone || ""}
              required={false}
            />
            <TextInput
              name="repeater"
              label="الربيتر"
              placeholder="اسم الربيتر"
              defaultValue={customer.repeater || ""}
              required={false}
            />
            <TextInput
              name="newPassword"
              type="password"
              label="كلمة مرور جديدة"
              placeholder="اتركها فارغة إذا لا تريد تغييرها"
              required={false}
            />
            <button type="submit" className={primaryButtonClass}>
              حفظ بيانات الدخول
            </button>
          </form>
        </SubSection>
      </div>

      <div className="mt-6">
        <SubSection title="جميع العمليات السابقة">
          {operations.length === 0 ? (
            <EmptyState text="لا توجد عمليات محفوظة لهذا الزبون حتى الآن." />
          ) : (
            <div className="space-y-3">
              {operations.map((operation) => (
                <div key={`${operation.table}-${operation.id}`} className="rounded-2xl border border-line bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-base font-black text-slate-900">
                        {getOperationLabel(operation)}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        التاريخ: {formatDate(operation.createdAt)}
                      </p>
                      {operation.reviewedAt ? (
                        <p className="mt-1 text-sm text-slate-600">
                          تاريخ المراجعة: {formatDate(operation.reviewedAt)}
                        </p>
                      ) : null}
                      {operation.note ? (
                        <p className="mt-1 text-sm text-slate-600">ملاحظة: {operation.note}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900">
                        {formatIqd(operation.amount)}
                      </div>
                      <form action={deleteCustomerOperationAction}>
                        <input type="hidden" name="operationId" value={operation.id} />
                        <input type="hidden" name="tableName" value={operation.table} />
                        <input type="hidden" name="redirectTo" value="/admin/customers" />
                        <button
                          type="submit"
                          className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700"
                        >
                          حذف
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SubSection>
      </div>
    </Panel>
  );
}

function getOperationLabel(
  operation: ReturnType<typeof getCustomerOperationHistory>[number],
) {
  if (operation.table === "payments") {
    return operation.paymentKind === "clear" ? "تصفير كامل للدين" : "تسديد دفعة";
  }

  if (operation.source === "manual") {
    return "إضافة دين مباشر";
  }

  if (operation.status === "approved") {
    return "طلب رصيد تمت الموافقة عليه";
  }

  if (operation.status === "rejected") {
    return "طلب رصيد مرفوض";
  }

  return "طلب رصيد قيد الانتظار";
}
