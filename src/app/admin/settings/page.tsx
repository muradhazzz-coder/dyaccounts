import { changeAdminPasswordAction, createCustomerAction } from "@/app/server-actions";
import {
  AdminLayoutShell,
  InlineMessage,
  Panel,
  SubSection,
  TextInput,
  darkButtonClass,
  primaryButtonClass,
} from "@/components/admin-ui";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams?: Promise<{
    passwordError?: string;
    passwordSuccess?: string;
    error?: string;
  }>;
};

export default async function AdminSettingsPage({ searchParams }: SettingsPageProps) {
  await requireAdmin();
  const params = (await searchParams) ?? {};

  const passwordMessage =
    params.passwordSuccess === "1"
      ? "تم تغيير كلمة مرور المدير بنجاح."
      : params.passwordError === "mismatch"
        ? "كلمة المرور الجديدة وتأكيدها غير متطابقين."
        : params.passwordError === "invalid-current"
          ? "كلمة المرور الحالية غير صحيحة."
          : null;

  const createCustomerMessage =
    params.error === "user-exists" ? "اسم المستخدم موجود مسبقًا، اختر اسمًا آخر." : null;

  return (
    <AdminLayoutShell
      title="الإعدادات والحسابات"
      subtitle="صفحة مركزة للعمليات الإدارية الأساسية مثل إنشاء الزبائن الجدد وإدارة كلمة مرور المدير."
      currentPath="/admin/settings"
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="إضافة زبون جديد"
          description="أنشئ حساب زبون جديد مع اسم المستخدم وكلمة المرور الخاصة به."
        >
          {createCustomerMessage ? <InlineMessage success={false} text={createCustomerMessage} /> : null}
          <SubSection title="بيانات الحساب الجديد">
            <form action={createCustomerAction} className="grid gap-4">
              <input type="hidden" name="redirectTo" value="/admin/settings" />
              <TextInput name="fullName" label="اسم الزبون" placeholder="مثال: أحمد علي" />
              <TextInput name="username" label="اسم المستخدم" placeholder="مثال: ahmad1" />
              <TextInput name="password" label="كلمة المرور" type="password" placeholder="اكتب كلمة المرور" />
              <button type="submit" className={primaryButtonClass}>
                إنشاء حساب الزبون
              </button>
            </form>
          </SubSection>
        </Panel>

        <Panel
          title="تغيير كلمة مرور المدير"
          description="يفضل تغيير كلمة المرور بشكل دوري خاصة إذا أصبح الوصول للتطبيق عبر الإنترنت."
        >
          {passwordMessage ? (
            <InlineMessage success={params.passwordSuccess === "1"} text={passwordMessage} />
          ) : null}
          <SubSection title="تحديث بيانات المدير">
            <form action={changeAdminPasswordAction} className="grid gap-4">
              <input type="hidden" name="redirectTo" value="/admin/settings" />
              <TextInput
                name="currentPassword"
                type="password"
                label="كلمة المرور الحالية"
                placeholder="أدخل كلمة المرور الحالية"
              />
              <TextInput
                name="newPassword"
                type="password"
                label="كلمة المرور الجديدة"
                placeholder="أدخل كلمة المرور الجديدة"
              />
              <TextInput
                name="confirmPassword"
                type="password"
                label="تأكيد كلمة المرور الجديدة"
                placeholder="أعد كتابة كلمة المرور الجديدة"
              />
              <button type="submit" className={darkButtonClass}>
                حفظ كلمة المرور الجديدة
              </button>
            </form>
          </SubSection>
        </Panel>
      </div>
    </AdminLayoutShell>
  );
}
