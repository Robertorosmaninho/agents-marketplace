"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearAdminSession, isAdminAuthenticated, isValidAdminToken, setAdminSession } from "@/lib/admin-auth";
import { createSuggestion, patchAdminSuggestion } from "@/lib/api";

export interface SuggestionActionState {
  ok: boolean;
  message: string;
}

export interface AdminLoginState {
  ok: boolean;
  message: string;
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

  redirect("/admin/suggestions");
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
