"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearAdminSession, isAdminAuthenticated, isValidAdminToken, setAdminSession } from "@/lib/admin-auth";
import {
  createSuggestion,
  patchAdminSuggestion,
  publishAdminProviderService,
  requestAdminProviderServiceChanges,
  suspendAdminProviderService,
  updateAdminProviderServiceSettlementMode
} from "@/lib/api";
import type { SettlementMode } from "@marketplace/shared";

export interface SuggestionActionState {
  ok: boolean;
  message: string;
}

export interface AdminLoginState {
  ok: boolean;
  message: string;
}

function buildAdminRedirect(path: string, key: "message" | "error", value: string): string {
  return `${path}?${key}=${encodeURIComponent(value)}`;
}

function parseSettlementMode(value: string): SettlementMode | null {
  return value === "community_direct" || value === "verified_escrow" ? value : null;
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitSuggestionAction(
  _previousState: SuggestionActionState,
  formData: FormData
): Promise<SuggestionActionState> {
  try {
    await createSuggestion({
      type: getString(formData, "type") === "source" ? "source" : "endpoint",
      serviceSlug: getString(formData, "serviceSlug") || undefined,
      title: getString(formData, "title"),
      description: getString(formData, "description"),
      sourceUrl: getString(formData, "sourceUrl") || undefined,
      requesterName: getString(formData, "requesterName") || undefined,
      requesterEmail: getString(formData, "requesterEmail") || undefined
    });

    return {
      ok: true,
      message: "Suggestion submitted. Providers and operators can now review it privately."
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Suggestion submission failed."
    };
  }
}

export async function adminLoginAction(
  _previousState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const token = getString(formData, "token");

  if (!isValidAdminToken(token)) {
    return {
      ok: false,
      message: "Invalid admin token."
    };
  }

  try {
    await setAdminSession();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Admin login failed."
    };
  }

  redirect("/admin/services");
}

export async function adminLogoutAction(): Promise<void> {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function updateSuggestionAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const id = getString(formData, "id");
  const status = getString(formData, "status");
  const internalNotes = getString(formData, "internalNotes");

  if (!id) {
    throw new Error("Suggestion id is required.");
  }

  await patchAdminSuggestion(id, {
    status:
      status === "submitted" ||
      status === "reviewing" ||
      status === "accepted" ||
      status === "rejected" ||
      status === "shipped"
        ? status
        : undefined,
    internalNotes: internalNotes || null
  });

  revalidatePath("/admin/suggestions");
}

export async function requestProviderServiceChangesAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const serviceId = getString(formData, "id");
  const reviewNotes = getString(formData, "reviewNotes");
  const reviewerIdentity = getString(formData, "reviewerIdentity") || null;
  const returnTo = getString(formData, "returnTo") || `/admin/services/${serviceId}`;

  if (!serviceId || !reviewNotes) {
    redirect(buildAdminRedirect(returnTo, "error", "Service id and review notes are required."));
  }

  try {
    await requestAdminProviderServiceChanges(serviceId, {
      reviewNotes,
      reviewerIdentity
    });
    revalidatePath("/admin/services");
    revalidatePath(`/admin/services/${serviceId}`);
    redirect(buildAdminRedirect(returnTo, "message", "Requested provider changes."));
  } catch (error) {
    redirect(buildAdminRedirect(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Failed to request provider changes."
    ));
  }
}

export async function publishProviderServiceAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const serviceId = getString(formData, "id");
  const settlementMode = parseSettlementMode(getString(formData, "settlementMode"));
  const reviewerIdentity = getString(formData, "reviewerIdentity") || null;
  const returnTo = getString(formData, "returnTo") || `/admin/services/${serviceId}`;

  if (!serviceId || !settlementMode) {
    redirect(buildAdminRedirect(returnTo, "error", "Service id and settlement tier are required."));
  }

  try {
    await publishAdminProviderService(serviceId, {
      reviewerIdentity,
      settlementMode
    });
    revalidatePath("/admin/services");
    revalidatePath(`/admin/services/${serviceId}`);
    redirect(buildAdminRedirect(
      returnTo,
      "message",
      settlementMode === "verified_escrow"
        ? "Published service as Verified."
        : "Published service as Community."
    ));
  } catch (error) {
    redirect(buildAdminRedirect(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Failed to publish provider service."
    ));
  }
}

export async function updateProviderServiceSettlementModeAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const serviceId = getString(formData, "id");
  const settlementMode = parseSettlementMode(getString(formData, "settlementMode"));
  const reviewerIdentity = getString(formData, "reviewerIdentity") || null;
  const returnTo = getString(formData, "returnTo") || `/admin/services/${serviceId}`;

  if (!serviceId || !settlementMode) {
    redirect(buildAdminRedirect(returnTo, "error", "Service id and settlement tier are required."));
  }

  try {
    await updateAdminProviderServiceSettlementMode(serviceId, {
      reviewerIdentity,
      settlementMode
    });
    revalidatePath("/admin/services");
    revalidatePath(`/admin/services/${serviceId}`);
    redirect(buildAdminRedirect(
      returnTo,
      "message",
      settlementMode === "verified_escrow"
        ? "Settlement tier updated to Verified."
        : "Settlement tier updated to Community."
    ));
  } catch (error) {
    redirect(buildAdminRedirect(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Failed to update settlement tier."
    ));
  }
}

export async function suspendProviderServiceAction(formData: FormData): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const serviceId = getString(formData, "id");
  const reviewNotes = getString(formData, "reviewNotes") || null;
  const reviewerIdentity = getString(formData, "reviewerIdentity") || null;
  const returnTo = getString(formData, "returnTo") || `/admin/services/${serviceId}`;

  if (!serviceId) {
    redirect(buildAdminRedirect(returnTo, "error", "Service id is required."));
  }

  try {
    await suspendAdminProviderService(serviceId, {
      reviewNotes,
      reviewerIdentity
    });
    revalidatePath("/admin/services");
    revalidatePath(`/admin/services/${serviceId}`);
    redirect(buildAdminRedirect(returnTo, "message", "Service suspended."));
  } catch (error) {
    redirect(buildAdminRedirect(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Failed to suspend provider service."
    ));
  }
}
