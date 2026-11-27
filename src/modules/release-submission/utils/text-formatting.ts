export function formatImportedText(text: string): string {
	return text
		.replace(/[‘’]/g, "'")
		.replace(/[“”]/g, '"')
		.replace(/[–—]/g, "-")
		.replaceAll("|", "/")
		.replace(/[\u200B\u2060\uFEFF]/g, "")
		.replace(/[Ａ-Ｚａ-ｚ]/g, (character) => character.normalize("NFKC"))
		.replace(/\{([^{}]+)\}/g, "($1)")
		.replace(/<([^<>]+)>/g, "($1)");
}
