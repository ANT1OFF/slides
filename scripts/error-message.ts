/** What a thrown value says: an Error's message, or the value itself as text. */
export function errorMessage(error: unknown): string {
  return typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
    ? error.message
    : String(error);
}
