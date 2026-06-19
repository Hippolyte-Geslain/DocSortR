import type { ClientSummary } from "@/hooks/useApi";

/** Sentinel key for documents with no detected client. */
export const UNCLASSIFIED_KEY = "__unclassified__";
export const UNCLASSIFIED_LABEL = "À classifier";

/** Stable key for a client row (null client → the unclassified bucket). */
export function clientKey(c: ClientSummary): string {
  return c.name ?? UNCLASSIFIED_KEY;
}

/** Human label for a client row. */
export function clientLabel(c: ClientSummary): string {
  return c.name ?? UNCLASSIFIED_LABEL;
}
