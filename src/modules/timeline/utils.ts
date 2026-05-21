// Normalize Unicode dash variants to a plain "-"
export function normalizeDashes(s: string): string {
	return String(s || "").replaceAll(/[–—−]/g, "-");
}

// Returns true for year tokens like "1970", "1966-67", "1965-1969"
export function isYearLikeToken(token: string): boolean {
	const t = normalizeDashes(token).trim();
	return /^\d{4}$/.test(t) || /^\d{4}\s*-\s*(\d{2}|\d{4})$/.test(t);
}

// Remove year-like and all-numeric tokens from role arrays
export function sanitizeRoles(rawRoles: string[]): string[] {
	const out: string[] = [];
	for (const r of rawRoles) {
		const t = String(r || "").trim();
		if (!t) continue;
		if (isYearLikeToken(t)) continue;
		if (/^\d+$/.test(t)) continue;
		out.push(t);
	}
	return out;
}

const HTML_ESCAPE_MAP: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

export function escapeHtml(s: string): string {
	if (s == null) return "";
	return String(s).replaceAll(/[&<>"']/g, (c) => HTML_ESCAPE_MAP[c] ?? c);
}

export function yearOf(d: Date | null): number | null {
	return d instanceof Date && !Number.isNaN(d.getTime())
		? d.getFullYear()
		: null;
}
