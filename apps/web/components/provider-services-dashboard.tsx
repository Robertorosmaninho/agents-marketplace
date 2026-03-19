"use client";

import React from "react";
import type { MarketplaceDeploymentNetwork } from "@marketplace/shared";

import { ProviderSessionGate } from "@/components/provider-session-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProviderService, fetchProviderAccount, fetchProviderServices } from "@/lib/api";

export function ProviderServicesDashboard({
  apiBaseUrl,
  deploymentNetwork
}: {
  apiBaseUrl: string;
  deploymentNetwork: MarketplaceDeploymentNetwork;
}) {
  return (
    <ProviderSessionGate
      deploymentNetwork={deploymentNetwork}
      title="Provider services"
      description="Create, edit, verify, and submit service drafts from the connected wallet."
    >
      {(session) => (
        <ProviderServicesDashboardInner
          apiBaseUrl={apiBaseUrl}
          accessToken={session.accessToken}
        />
      )}
    </ProviderSessionGate>
  );
}

function ProviderServicesDashboardInner({
  apiBaseUrl,
  accessToken
}: {
  apiBaseUrl: string;
  accessToken: string;
}) {
  const [services, setServices] = React.useState<Awaited<ReturnType<typeof fetchProviderServices>>>([]);
  const [hasAccount, setHasAccount] = React.useState<boolean | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    slug: "",
    apiNamespace: "",
    name: "",
    tagline: "",
    about: "",
    categories: "Research",
    promptIntro: "",
    setupInstructions: "Review the service docs.\nCall the paid endpoints with a funded Fast wallet.",
    websiteUrl: "",
    payoutWallet: ""
  });

  React.useEffect(() => {
    startTransition(async () => {
      try {
        const [account, nextServices] = await Promise.all([
          fetchProviderAccount(apiBaseUrl, accessToken),
          fetchProviderServices(apiBaseUrl, accessToken)
        ]);
        setHasAccount(Boolean(account));
        setServices(nextServices);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to load provider services.");
      }
    });
  }, [accessToken, apiBaseUrl]);

  function onCreateService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const detail = await createProviderService(apiBaseUrl, accessToken, {
          slug: form.slug,
          apiNamespace: form.apiNamespace,
          name: form.name,
          tagline: form.tagline,
          about: form.about,
          categories: form.categories
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          promptIntro: form.promptIntro || `I want to use the "${form.name}" service on Fast Marketplace.`,
          setupInstructions: form.setupInstructions
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
          websiteUrl: form.websiteUrl || undefined,
          payoutWallet: form.payoutWallet
        });
        window.location.assign(`/providers/services/${detail.service.id}`);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Service creation failed.");
      }
    });
  }

  if (hasAccount === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create a provider profile first</CardTitle>
          <CardDescription>Service drafts are attached to the provider account for this wallet session.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.assign("/providers/onboard")}>Open onboarding</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Your service drafts</CardTitle>
          <CardDescription>Published services stay live while you keep editing the next draft version.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No service drafts yet.</p>
          ) : null}
          {services.map((service) => (
            <div key={service.service.id} className="rounded-md border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{service.service.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {service.service.apiNamespace} / {service.service.status}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => window.location.assign(`/providers/services/${service.service.id}`)}>
                    Edit
                  </Button>
                  <Button variant="outline" onClick={() => window.location.assign(`/providers/services/${service.service.id}/review`)}>
                    Review
                  </Button>
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                {service.endpoints.length} endpoint draft{service.endpoints.length === 1 ? "" : "s"}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New service draft</CardTitle>
          <CardDescription>Create the public service metadata first, then add endpoints and verification.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onCreateService}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Service name
                <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Tagline
                <Input value={form.tagline} onChange={(event) => setForm((current) => ({ ...current, tagline: event.target.value }))} required />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Slug
                <Input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                API namespace
                <Input value={form.apiNamespace} onChange={(event) => setForm((current) => ({ ...current, apiNamespace: event.target.value }))} required />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium">
              About
              <Textarea value={form.about} onChange={(event) => setForm((current) => ({ ...current, about: event.target.value }))} required />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Categories
                <Input value={form.categories} onChange={(event) => setForm((current) => ({ ...current, categories: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Website URL
                <Input value={form.websiteUrl} onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))} placeholder="https://example.com" />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium">
              Prompt intro
              <Textarea value={form.promptIntro} onChange={(event) => setForm((current) => ({ ...current, promptIntro: event.target.value }))} />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Setup instructions
              <Textarea value={form.setupInstructions} onChange={(event) => setForm((current) => ({ ...current, setupInstructions: event.target.value }))} />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Payout wallet
              <Input value={form.payoutWallet} onChange={(event) => setForm((current) => ({ ...current, payoutWallet: event.target.value }))} required />
            </label>

            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create draft"}
            </Button>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
