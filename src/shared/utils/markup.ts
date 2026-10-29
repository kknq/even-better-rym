import { fetchInPage } from "./fetch";

const PREVIEW_ESCAPES: Record<string, string> = {
	n: "\n",
	r: "\r",
	t: "\t",
	b: "\b",
	f: "\f",
	v: "\v",
	"0": "\0",
};

function decodePreviewHtml(html: string): string {
	// Decode the response's JavaScript string without executing page code.
	return html.replace(
		/\\(u[\da-f]{4}|x[\da-f]{2}|\r\n|[\s\S])/gi,
		(_match, sequence: string) => {
			if (/^(u[\da-f]{4}|x[\da-f]{2})$/i.test(sequence)) {
				return String.fromCharCode(Number.parseInt(sequence.slice(1), 16));
			}
			if (sequence === "\n" || sequence === "\r" || sequence === "\r\n") {
				return "";
			}
			return PREVIEW_ESCAPES[sequence] ?? sequence;
		},
	);
}

export async function parseMarkup(markup: string): Promise<Element> {
	// if markup is empty, just return an empty span
	if (!markup) {
		const span = document.createElement("span");
		span.className = "rendered_text";
		return span;
	}

	const output = await fetchInPage({
		url: "https://rateyourmusic.com/go/processpreview",
		method: "POST",
		urlParameters: {
			id: "body",
			text: markup,
		},
	});

	const rendered = new DOMParser()
		.parseFromString(decodePreviewHtml(output.slice(33, -2)), "text/html")
		.querySelector(".rendered_text");
	if (!rendered) throw new Error("RYM preview did not contain rendered text.");
	return rendered;
}
