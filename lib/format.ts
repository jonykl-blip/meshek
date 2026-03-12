/**
 * Extract initials from a full name.
 * Returns first + last initial for multi-word names, first char for single-word, empty for empty.
 */
export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") return "";
  if (parts.length === 1) return parts[0].charAt(0);
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
}
