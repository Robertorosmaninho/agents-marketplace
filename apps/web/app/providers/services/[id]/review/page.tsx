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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8 md:px-10 md:py-12">
      <ProviderServiceReview
        apiBaseUrl={apiBaseUrl}
        deploymentNetwork={deploymentNetwork}
        serviceId={id}
      />
    </main>
  );
}
