import DOMPurify from 'dompurify';

/**
 * Sanitizes a string of HTML, removing scripts and other dangerous content.
 * Always run untrusted markup through this before setting innerHTML or outerHTML.
 */
export function sanitize(html: string): string {
    return DOMPurify.sanitize(html, { RETURN_TRUSTED_TYPE: false });
}
