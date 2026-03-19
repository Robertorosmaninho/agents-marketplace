import { CatalogSnapshotCard } from "@/components/catalog-snapshot-card";
import { fetchServices } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const services = await fetchServices();

  return (
    <main className="page-shell">
      <section className="section-sep">
        <div className="section-container section-stack">
          <div className="page-intro">
            <p className="eyebrow">Stats</p>
            <div className="space-y-4">
              <h1 className="section-title">Marketplace totals</h1>
              <p className="body-copy">
                A live snapshot of catalog coverage and paid request volume across the public marketplace.
              </p>
            </div>
          </div>

          <CatalogSnapshotCard services={services} />
        </div>
      </section>
    </main>
  );
}
