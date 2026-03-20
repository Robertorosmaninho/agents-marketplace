import { AdminLoginForm } from "@/components/admin-login-form";

export default function AdminLoginPage() {
  return (
    <main className="page-shell">
      <section className="section-sep">
        <div className="section-container section-stack">
          <div className="grid gap-8">
            <div className="page-intro">
              <div className="eyebrow">Internal workspace</div>
              <div className="space-y-4">
                <h1 className="section-title">Review the supply queue</h1>
                <p className="body-copy">
                  Use the shared admin token to review submitted provider services, assign settlement tiers, and triage endpoint or source requests.
                </p>
              </div>
            </div>
            <AdminLoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
