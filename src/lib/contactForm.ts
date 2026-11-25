/** Body of POST /api/contact (see src/worker/controllers/ContactController.ts); `company` is the honeypot field. */
export interface ContactPayload {
  readonly name: FormDataEntryValue;
  readonly email: FormDataEntryValue;
  readonly project: FormDataEntryValue;
  readonly token: FormDataEntryValue;
  readonly company: FormDataEntryValue;
}

export function readContactPayload(data: FormData): ContactPayload {
  return {
    name: data.get("name") ?? "",
    email: data.get("email") ?? "",
    project: data.get("project") ?? "",
    token: data.get("cf-turnstile-response") ?? "",
    company: data.get("company") ?? "",
  };
}

/** Resolves true when the Worker accepted the submission; any network or HTTP failure resolves false. */
export async function postContact(endpoint: string, payload: ContactPayload): Promise<boolean> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
}
