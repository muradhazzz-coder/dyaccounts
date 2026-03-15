import type { ReactNode } from "react";

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-line bg-panel p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-8">
        <div className="mb-8 flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand">dyaccounts</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900 md:text-4xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{subtitle}</p>
          </div>
          {actions}
        </div>
        {children}
      </section>
    </main>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-line bg-white/80 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <h3 className="mt-3 text-3xl font-black text-slate-900">{value}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{hint}</p>
    </article>
  );
}
