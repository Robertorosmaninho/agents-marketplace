import { ProviderOnboard } from "@/components/provider-onboard";
import { resolveWebDeploymentNetwork } from "@/lib/network";

export const dynamic = "force-dynamic";

export default function ProviderOnboardPage() {
  const apiBaseUrl = process.env.MARKETPLACE_API_BASE_URL ?? "http://localhost:3000";
  const deploymentNetwork = resolveWebDeploymentNetwork(process.env.MARKETPLACE_FAST_NETWORK).deploymentNetwork;

  return (
    <main className="page-shell">
      <section className="section-sep">
        <div className="section-container section-stack">
          <ProviderOnboard apiBaseUrl={apiBaseUrl} deploymentNetwork={deploymentNetwork} />
        </div>
      </section>
    </main>
  );
}
