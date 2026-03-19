"use client";

import React from "react";
import type {
  CreateProviderEndpointDraftInput,
  MarketplaceDeploymentNetwork,
  UpdateProviderEndpointDraftInput
} from "@marketplace/shared";

import { CopyButton } from "@/components/copy-button";
import { ProviderSessionGate } from "@/components/provider-session-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createProviderEndpoint,
  createProviderVerificationChallenge,
  deleteProviderEndpoint,
  fetchProviderService,
  submitProviderService,
  updateProviderEndpoint,
  updateProviderService,
  verifyProviderService
} from "@/lib/api";

export function ProviderServiceEditor({
  apiBaseUrl,
  deploymentNetwork,
  serviceId
}: {
  apiBaseUrl: string;
  deploymentNetwork: MarketplaceDeploymentNetwork;
  serviceId: string;
}) {
  return (
    <ProviderSessionGate
      deploymentNetwork={deploymentNetwork}
      title="Provider service editor"
      description="Edit metadata, configure endpoints, and complete ownership verification."
    >
      {(session) => (
        <ProviderServiceEditorInner
          apiBaseUrl={apiBaseUrl}
          accessToken={session.accessToken}
          serviceId={serviceId}
        />
      )}
    </ProviderSessionGate>
  );
}

function ProviderServiceEditorInner({
  apiBaseUrl,
  accessToken,
  serviceId
}: {
  apiBaseUrl: string;
  accessToken: string;
  serviceId: string;
}) {
  const [detail, setDetail] = React.useState<Awaited<ReturnType<typeof fetchProviderService>> | undefined>(undefined);
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [challenge, setChallenge] = React.useState<{ token: string; expectedUrl: string } | null>(null);

  React.useEffect(() => {
    startTransition(async () => {
      try {
        setError(null);
        setDetail(await fetchProviderService(apiBaseUrl, accessToken, serviceId));
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to load service draft.");
      }
    });
  }, [accessToken, apiBaseUrl, serviceId]);

  const [newEndpoint, setNewEndpoint] = React.useState(defaultEndpointFormState());

  if (detail === undefined) {
    return (
      <Card variant="frosted">
        <CardContent className="p-6 text-sm text-muted-foreground">
          {error ?? "Loading service draft..."}
        </CardContent>
      </Card>
    );
  }

  if (detail === null) {
    return (
      <Card variant="frosted">
        <CardHeader>
          <CardTitle>Service draft unavailable</CardTitle>
          <CardDescription>
            This draft was deleted or is no longer accessible from the connected wallet session.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => window.location.assign("/providers/services")}>
            Back to drafts
          </Button>
        </CardContent>
      </Card>
    );
  }

  async function refresh() {
    setDetail(await fetchProviderService(apiBaseUrl, accessToken, serviceId));
  }

  function onSaveService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await updateProviderService(apiBaseUrl, accessToken, serviceId, {
          name: String(form.get("name") ?? ""),
          tagline: String(form.get("tagline") ?? ""),
          about: String(form.get("about") ?? ""),
          categories: String(form.get("categories") ?? "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          promptIntro: String(form.get("promptIntro") ?? ""),
          setupInstructions: String(form.get("setupInstructions") ?? "")
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
          websiteUrl: String(form.get("websiteUrl") ?? "") || null,
          payoutWallet: String(form.get("payoutWallet") ?? "") || null
        });
        await refresh();
        setMessage("Service draft updated.");
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Service update failed.");
      }
    });
  }

  function onCreateEndpoint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await createProviderEndpoint(apiBaseUrl, accessToken, serviceId, buildEndpointInput(newEndpoint));
        setNewEndpoint(defaultEndpointFormState());
        await refresh();
        setMessage("Endpoint draft created.");
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Endpoint creation failed.");
      }
    });
  }

  function onCreateVerificationChallenge() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        setChallenge(await createProviderVerificationChallenge(apiBaseUrl, accessToken, serviceId));
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to create verification challenge.");
      }
    });
  }

  function onVerifyService() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await verifyProviderService(apiBaseUrl, accessToken, serviceId);
        await refresh();
        setMessage("Verification status refreshed.");
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Service verification failed.");
      }
    });
  }

  function onSubmitService() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await submitProviderService(apiBaseUrl, accessToken, serviceId);
        await refresh();
        setMessage("Service submitted for review.");
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Service submit failed.");
      }
    });
  }

  return (
    <div className="grid gap-6">
      <Card variant="frosted">
        <CardHeader>
          <CardTitle className="text-3xl">{detail.service.name}</CardTitle>
          <CardDescription>{detail.service.apiNamespace} · {detail.service.status}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSaveService}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Name
                <Input name="name" defaultValue={detail.service.name} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Tagline
                <Input name="tagline" defaultValue={detail.service.tagline} />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              About
              <Textarea name="about" defaultValue={detail.service.about} />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Categories
                <Input name="categories" defaultValue={detail.service.categories.join(", ")} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Website URL
                <Input name="websiteUrl" defaultValue={detail.service.websiteUrl ?? ""} />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Prompt intro
              <Textarea name="promptIntro" defaultValue={detail.service.promptIntro} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Setup instructions
              <Textarea name="setupInstructions" defaultValue={detail.service.setupInstructions.join("\n")} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Payout wallet
              <Input name="payoutWallet" defaultValue={detail.service.payoutWallet ?? ""} />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save metadata"}</Button>
              <Button type="button" variant="outline" onClick={() => window.location.assign(`/providers/services/${serviceId}/review`)}>
                Open review page
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card variant="frosted">
        <CardHeader>
          <CardTitle className="text-3xl">Website verification</CardTitle>
          <CardDescription>Host the issued token on your site before submitting this service for review.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Current status: {detail.verification?.status ?? "not started"}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={onCreateVerificationChallenge} disabled={pending}>
              Create challenge
            </Button>
            <Button type="button" variant="outline" onClick={onVerifyService} disabled={pending}>
              Verify ownership
            </Button>
            <Button type="button" variant="outline" onClick={onSubmitService} disabled={pending}>
              Submit for review
            </Button>
          </div>
          {challenge ? (
            <div className="grid gap-4 rounded-card border border-border bg-background/70 p-5 dark:bg-background/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Expected URL</div>
                  <div className="text-sm font-medium break-all">{challenge.expectedUrl}</div>
                </div>
                <CopyButton value={challenge.expectedUrl} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Token</div>
                  <div className="text-sm font-medium break-all">{challenge.token}</div>
                </div>
                <CopyButton value={challenge.token} />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card variant="frosted">
        <CardHeader>
          <CardTitle className="text-3xl">Endpoint drafts</CardTitle>
          <CardDescription>Provider-authored endpoints are POST JSON and sync-only in v1.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {detail.endpoints.map((endpoint) => (
            <EndpointDraftCard
              key={endpoint.id}
              apiBaseUrl={apiBaseUrl}
              accessToken={accessToken}
              serviceId={serviceId}
              endpoint={endpoint}
              onChange={async () => {
                await refresh();
                setMessage("Endpoint draft updated.");
              }}
              onDelete={async () => {
                await deleteProviderEndpoint(apiBaseUrl, accessToken, serviceId, endpoint.id);
                await refresh();
                setMessage("Endpoint draft deleted.");
              }}
            />
          ))}

          <form className="grid gap-4 rounded-card border border-border bg-background/70 p-5 dark:bg-background/20" onSubmit={onCreateEndpoint}>
            <div className="metric-label">New endpoint</div>
            <EndpointDraftFields state={newEndpoint} onChange={setNewEndpoint} />
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create endpoint"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
    </div>
  );
}

function EndpointDraftCard({
  apiBaseUrl,
  accessToken,
  serviceId,
  endpoint,
  onChange,
  onDelete
}: {
  apiBaseUrl: string;
  accessToken: string;
  serviceId: string;
  endpoint: Awaited<ReturnType<typeof fetchProviderService>> extends infer T
    ? T extends { endpoints: infer U }
      ? U extends Array<infer V>
        ? V
        : never
      : never
    : never;
  onChange: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [state, setState] = React.useState(() => endpointToFormState(endpoint));
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await updateProviderEndpoint(
          apiBaseUrl,
          accessToken,
          serviceId,
          endpoint.id,
          buildEndpointUpdateInput(state, endpoint.hasUpstreamSecret)
        );
        await onChange();
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Endpoint update failed.");
      }
    });
  }

  return (
    <form className="grid gap-4 rounded-card border border-border bg-background/70 p-5 dark:bg-background/20" onSubmit={onSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-medium tracking-headline">{endpoint.title}</div>
          <div className="text-xs text-muted-foreground">{endpoint.operation}</div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await onDelete();
                } catch (nextError) {
                  setError(nextError instanceof Error ? nextError.message : "Endpoint delete failed.");
                }
              });
            }}
          >
            Delete
          </Button>
        </div>
      </div>
      <EndpointDraftFields state={state} onChange={setState} />
      {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
    </form>
  );
}

function EndpointDraftFields({
  state,
  onChange
}: {
  state: EndpointFormState;
  onChange: React.Dispatch<React.SetStateAction<EndpointFormState>>;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Operation slug
          <Input
            value={state.operation}
            placeholder="quote-price"
            required
            onChange={(event) => onChange((current) => ({ ...current, operation: event.target.value }))}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Price
          <Input
            value={state.price}
            placeholder="$0.25"
            required
            onChange={(event) => onChange((current) => ({ ...current, price: event.target.value }))}
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Title
          <Input
            value={state.title}
            placeholder="Get token quote"
            required
            onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Upstream base URL
          <Input
            value={state.upstreamBaseUrl}
            type="url"
            placeholder="https://api.example.com"
            required
            onChange={(event) => onChange((current) => ({ ...current, upstreamBaseUrl: event.target.value }))}
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Description
        <Textarea
          value={state.description}
          placeholder="Return a live quote for a requested trading symbol."
          required
          onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))}
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Upstream path
          <Input
            value={state.upstreamPath}
            placeholder="/v1/quote"
            required
            onChange={(event) => onChange((current) => ({ ...current, upstreamPath: event.target.value }))}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Auth mode
          <Input
            value={state.upstreamAuthMode}
            placeholder="none"
            required
            onChange={(event) => onChange((current) => ({ ...current, upstreamAuthMode: event.target.value as EndpointFormState["upstreamAuthMode"] }))}
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Header name
          <Input
            value={state.upstreamAuthHeaderName}
            placeholder="X-Provider-Key"
            onChange={(event) => onChange((current) => ({ ...current, upstreamAuthHeaderName: event.target.value }))}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Upstream secret
          <Input
            value={state.upstreamSecret}
            placeholder="leave blank to keep current or paste a new secret"
            onChange={(event) => onChange((current) => ({ ...current, upstreamSecret: event.target.value }))}
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Usage notes
        <Textarea
          value={state.usageNotes}
          placeholder="Send a symbol like FAST or BTC-USD. Paid calls return 402 first, then succeed after wallet payment."
          onChange={(event) => onChange((current) => ({ ...current, usageNotes: event.target.value }))}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Request schema JSON
        <Textarea
          value={state.requestSchemaJson}
          placeholder={REQUEST_SCHEMA_PLACEHOLDER}
          required
          onChange={(event) => onChange((current) => ({ ...current, requestSchemaJson: event.target.value }))}
          className="min-h-40 font-mono"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Response schema JSON
        <Textarea
          value={state.responseSchemaJson}
          placeholder={RESPONSE_SCHEMA_PLACEHOLDER}
          required
          onChange={(event) => onChange((current) => ({ ...current, responseSchemaJson: event.target.value }))}
          className="min-h-40 font-mono"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Request example JSON
        <Textarea
          value={state.requestExample}
          placeholder={REQUEST_EXAMPLE_PLACEHOLDER}
          required
          onChange={(event) => onChange((current) => ({ ...current, requestExample: event.target.value }))}
          className="min-h-32 font-mono"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Response example JSON
        <Textarea
          value={state.responseExample}
          placeholder={RESPONSE_EXAMPLE_PLACEHOLDER}
          required
          onChange={(event) => onChange((current) => ({ ...current, responseExample: event.target.value }))}
          className="min-h-32 font-mono"
        />
      </label>
    </>
  );
}

interface EndpointFormState {
  operation: string;
  title: string;
  description: string;
  price: string;
  requestSchemaJson: string;
  responseSchemaJson: string;
  requestExample: string;
  responseExample: string;
  usageNotes: string;
  upstreamBaseUrl: string;
  upstreamPath: string;
  upstreamAuthMode: "none" | "bearer" | "header";
  upstreamAuthHeaderName: string;
  upstreamSecret: string;
}

function defaultEndpointFormState(): EndpointFormState {
  return {
    operation: "",
    title: "",
    description: "",
    price: "",
    requestSchemaJson: "",
    responseSchemaJson: "",
    requestExample: "",
    responseExample: "",
    usageNotes: "",
    upstreamBaseUrl: "",
    upstreamPath: "",
    upstreamAuthMode: "none",
    upstreamAuthHeaderName: "",
    upstreamSecret: ""
  };
}

const REQUEST_SCHEMA_PLACEHOLDER = `{
  "type": "object",
  "properties": {
    "symbol": {
      "type": "string"
    }
  },
  "required": ["symbol"],
  "additionalProperties": false
}`;

const RESPONSE_SCHEMA_PLACEHOLDER = `{
  "type": "object",
  "properties": {
    "symbol": {
      "type": "string"
    },
    "price": {
      "type": "number"
    }
  },
  "required": ["symbol", "price"],
  "additionalProperties": false
}`;

const REQUEST_EXAMPLE_PLACEHOLDER = `{
  "symbol": "FAST"
}`;

const RESPONSE_EXAMPLE_PLACEHOLDER = `{
  "symbol": "FAST",
  "price": 42.5
}`;

function endpointToFormState(endpoint: {
  operation: string;
  title: string;
  description: string;
  price: string;
  requestSchemaJson: unknown;
  responseSchemaJson: unknown;
  requestExample: unknown;
  responseExample: unknown;
  usageNotes: string | null;
  upstreamBaseUrl: string | null;
  upstreamPath: string | null;
  upstreamAuthMode: "none" | "bearer" | "header" | null;
  upstreamAuthHeaderName: string | null;
}): EndpointFormState {
  return {
    operation: endpoint.operation,
    title: endpoint.title,
    description: endpoint.description,
    price: endpoint.price,
    requestSchemaJson: JSON.stringify(endpoint.requestSchemaJson, null, 2),
    responseSchemaJson: JSON.stringify(endpoint.responseSchemaJson, null, 2),
    requestExample: JSON.stringify(endpoint.requestExample, null, 2),
    responseExample: JSON.stringify(endpoint.responseExample, null, 2),
    usageNotes: endpoint.usageNotes ?? "",
    upstreamBaseUrl: endpoint.upstreamBaseUrl ?? "",
    upstreamPath: endpoint.upstreamPath ?? "/",
    upstreamAuthMode: endpoint.upstreamAuthMode ?? "none",
    upstreamAuthHeaderName: endpoint.upstreamAuthHeaderName ?? "",
    upstreamSecret: ""
  };
}

function buildEndpointInput(state: EndpointFormState): CreateProviderEndpointDraftInput {
  return {
    operation: state.operation,
    title: state.title,
    description: state.description,
    billingType: "fixed_x402",
    price: state.price,
    mode: "sync",
    requestSchemaJson: JSON.parse(state.requestSchemaJson),
    responseSchemaJson: JSON.parse(state.responseSchemaJson),
    requestExample: JSON.parse(state.requestExample),
    responseExample: JSON.parse(state.responseExample),
    usageNotes: state.usageNotes || null,
    upstreamBaseUrl: state.upstreamBaseUrl,
    upstreamPath: state.upstreamPath,
    upstreamAuthMode: state.upstreamAuthMode,
    upstreamAuthHeaderName: state.upstreamAuthHeaderName || null,
    upstreamSecret: state.upstreamSecret || null
  };
}

function buildEndpointUpdateInput(state: EndpointFormState, hasSecret: boolean): UpdateProviderEndpointDraftInput {
  return {
    operation: state.operation,
    title: state.title,
    description: state.description,
    billingType: "fixed_x402",
    price: state.price,
    requestSchemaJson: JSON.parse(state.requestSchemaJson),
    responseSchemaJson: JSON.parse(state.responseSchemaJson),
    requestExample: JSON.parse(state.requestExample),
    responseExample: JSON.parse(state.responseExample),
    usageNotes: state.usageNotes || null,
    upstreamBaseUrl: state.upstreamBaseUrl,
    upstreamPath: state.upstreamPath,
    upstreamAuthMode: state.upstreamAuthMode,
    upstreamAuthHeaderName: state.upstreamAuthHeaderName || null,
    upstreamSecret: state.upstreamSecret || undefined,
    clearUpstreamSecret: hasSecret && state.upstreamSecret === "" && state.upstreamAuthMode === "none" ? true : undefined
  };
}
