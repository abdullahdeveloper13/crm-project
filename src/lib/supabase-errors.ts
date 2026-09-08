export function toUserFacingError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message ?? "")
      : error instanceof Error
        ? error.message
        : "";
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code ?? "")
      : "";
  const message = raw.toLowerCase();

  if (
    code === "PGRST301" ||
    message.includes("jwt expired") ||
    message.includes("invalid jwt") ||
    message.includes("not authenticated")
  ) {
    return "Your session has expired. Please sign in again.";
  }
  if (code === "PGRST205" || message.includes("schema cache") || message.includes("could not find the table")) {
    return "The database schema is missing in this Supabase project. Apply the latest migrations, then retry.";
  }
  if (code === "PGRST202" || message.includes("could not find the function")) {
    return "A required database function is missing. Apply the latest Supabase migrations, then retry.";
  }
  if (
    code === "42501" ||
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("not allowed")
  ) {
    return "You don't have permission to perform this action.";
  }
  if (message.includes("organization could not") || message.includes("no rows")) {
    return "This organization could not be found or you no longer have access.";
  }
  if (message.includes("invitation was sent to a different")) {
    return "This invitation was sent to a different email address. Sign in with the invited email.";
  }
  if (message.includes("invitation has expired")) {
    return "This invitation has expired. Ask an admin to send a new one.";
  }
  if (message.includes("invitation not found") || message.includes("no longer valid")) {
    return "This invitation is not valid. It may have already been used.";
  }
  if (message.includes("must be signed in")) {
    return "Please sign in to continue.";
  }
  if (message.includes("unsupported provider") || message.includes("provider is not enabled")) {
    return "Google sign-in is not enabled for this project. Use email and password, or ask an admin to enable the Google provider in Supabase Auth.";
  }
  if (message.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (message.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (raw && raw.length < 180 && !message.includes("violates") && !message.includes("sql")) {
    return raw;
  }
  return fallback;
}

export function logTechnicalError(context: string, error: unknown) {
  console.error(`[NovaCRM] ${context}`, error);
}
