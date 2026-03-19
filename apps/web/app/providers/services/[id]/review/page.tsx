import { ProviderServiceReview } from "@/components/provider-service-review";
import { resolveWebDeploymentNetwork } from "@/lib/network";

export const dynamic = "force-dynamic";

export default async function ProviderServiceReviewPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const apiBaseUrl = process.env.MARKETPLACE_API_BASE_URL ?? "http://localhost:3000";
  const deploymentNetwork = resolveWebDeploymentNetwork(process.env.MARKETPLACE_FAST_NETWORK).deploymentNetwork;
  const { id } = await params;

  return (
    <main className="page-shell">
      <section className="section-sep">
        <div className="section-container section-stack">
          <ProviderServiceReview
            apiBaseUrl={apiBaseUrl}
            deploymentNetwork={deploymentNetwork}
            serviceId={id}
          />
        </div>
      </section>
    </main>
  );
}
