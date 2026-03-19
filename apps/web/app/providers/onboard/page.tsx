import { ProviderOnboard } from "@/components/provider-onboard";
import { resolveWebDeploymentNetwork } from "@/lib/network";

export const dynamic = "force-dynamic";

export default function ProviderOnboardPage() {
  const apiBaseUrl = process.env.MARKETPLACE_API_BASE_URL ?? "http://localhost:3000";
  const deploymentNetwork = resolveWebDeploymentNetwork(process.env.MARKETPLACE_FAST_NETWORK).deploymentNetwork;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-8 md:px-10 md:py-12">
      <ProviderOnboard apiBaseUrl={apiBaseUrl} deploymentNetwork={deploymentNetwork} />
    </main>
  );
}
