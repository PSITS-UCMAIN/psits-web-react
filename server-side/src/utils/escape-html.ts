/**
 * Escapes special HTML characters in a string to prevent XSS or layout breaking.
 *
 * Characters replaced:
 * & -> &amp;
 * < -> &lt;
 * > -> &gt;
 * " -> &quot;
 * ' -> &#39;
 *
 * @param unsafe - The string that may contain HTML tags
 * @returns The escaped, safe string
 */
export const escapeHTML = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};
