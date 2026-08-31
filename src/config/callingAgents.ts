// Dedicated calling-agent accounts. These logins can ONLY access /calling and
// only ever see the calling leads an admin assigned to them.
export const CALLING_AGENT_EMAILS = [
  "swishviewsales1@swishview.com",
  "swishviewsales2@swishview.com",
] as const;

export const CALLING_AGENT_DISPLAY: Record<string, string> = {
  "swishviewsales1@swishview.com": "Caller 1",
  "swishviewsales2@swishview.com": "Caller 2",
};

export const isCallingAgent = (email?: string | null) =>
  !!email && (CALLING_AGENT_EMAILS as readonly string[]).includes(email.trim().toLowerCase());
