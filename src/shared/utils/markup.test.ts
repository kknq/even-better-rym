// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchInPage } from "./fetch";
import { parseMarkup } from "./markup";

vi.mock("./fetch", () => ({ fetchInPage: vi.fn() }));

// Keep the legacy endpoint envelope separate from its escaped HTML payload.
function previewResponse(html: string): string {
	return `${" ".repeat(33)}${html}")`;
}

beforeEach(() => {
	vi.resetAllMocks();
});

describe("parseMarkup", () => {
	test("returns empty rendered text without requesting a preview", async () => {
		const rendered = await parseMarkup("");
		expect(rendered.outerHTML).toBe('<span class="rendered_text"></span>');
		expect(fetchInPage).not.toHaveBeenCalled();
	});

	test("decodes response newlines while preserving RYM's line breaks", async () => {
		vi.mocked(fetchInPage).mockResolvedValue(
			previewResponse(
				String.raw`<span class=\"rendered_text\">first<br />\n<br />\r\n<b>second</b></span>`,
			),
		);

		const rendered = await parseMarkup("first\n\n[b]second[/b]");

		expect(fetchInPage).toHaveBeenCalledWith({
			url: "https://rateyourmusic.com/go/processpreview",
			method: "POST",
			urlParameters: { id: "body", text: "first\n\n[b]second[/b]" },
		});
		expect(rendered.querySelectorAll("br")).toHaveLength(2);
		expect(rendered.textContent).toBe("first\n\nsecond");
		expect(rendered.querySelector("b")?.textContent).toBe("second");
	});

	test("preserves image aspect-ratio wrappers from the saved image guide", async () => {
		vi.mocked(fetchInPage).mockResolvedValue(
			previewResponse(
				String.raw`<span class=\"rendered_text\"><div style=\"max-width:600px;\"><div style=\"position:relative;\n padding-bottom:calc( 100% / 2.0905923344947737);\n\"><a aria-label=\"User-uploaded image\" href=\"/images/all?type=w&amp;assoc_id=2616576\"><img class=\"wiki-image\" style=\"position:absolute;\n top:0;\n left:0;\n width:100%;\" src=\"//cdn.sonemic.net/i/600/w/de987a6b3a15b0b6deb2c6f0ed7cd9e6/3973956\" alt=\"\" /></a></div></div><br />after</span>`,
			),
		);

		const rendered = await parseMarkup("[wi:example]\nafter");
		const wrapper = rendered.querySelector<HTMLElement>("div > div");
		const image = rendered.querySelector("img");

		expect(wrapper?.style.position).toBe("relative");
		expect(wrapper?.getAttribute("style")).toContain(
			"padding-bottom:calc( 100% / 2.0905923344947737)",
		);
		expect(wrapper?.style.paddingBottom).not.toBe("");
		expect(image?.style.position).toBe("absolute");
		expect(image?.style.top).toBe("0px");
		expect(image?.style.left).toBe("0px");
		expect(image?.style.width).toBe("100%");
		expect(image?.getAttribute("src")).toBe(
			"//cdn.sonemic.net/i/600/w/de987a6b3a15b0b6deb2c6f0ed7cd9e6/3973956",
		);
		expect(rendered.textContent).toBe("after");
	});

	test("decodes quotes and backslashes once without interpreting literal user text", async () => {
		vi.mocked(fetchInPage).mockResolvedValue(
			previewResponse(
				String.raw`<span class=\"rendered_text\">it\'s \"quoted\": C:\\new\\test, \\n &amp; &lt;b&gt;</span>`,
			),
		);

		const rendered = await parseMarkup("literal text");

		expect(rendered.textContent).toBe(
			String.raw`it's "quoted": C:\new\test, \n & <b>`,
		);
		expect(rendered.querySelector("b")).toBeNull();
	});

	test("decodes hexadecimal escapes and JavaScript line continuations", async () => {
		vi.mocked(fetchInPage).mockResolvedValue(
			previewResponse(
				'<span class=\\"rendered_text\\">\\u00e9\\x21\\\nnext</span>',
			),
		);

		expect((await parseMarkup("text")).textContent).toBe("\u00e9!next");
	});

	test("preserves combined formatting and links from the additional guide", async () => {
		vi.mocked(fetchInPage).mockResolvedValue(
			previewResponse(
				String.raw`<span class=\"rendered_text\"><blockquote><ul><li><b><i><span style=\"color:#8A2BE2\">Example</span></i></b></li></ul></blockquote><br /><a class=\"artist\" href=\"/artist/fiona-apple\">Fiona Apple</a></span>`,
			),
		);

		const rendered = await parseMarkup(
			"[blockquote][ul][li][b][i][color #8A2BE2]Example[/color][/i][/b][/li][/ul][/blockquote]\n[Artist27]",
		);

		expect(
			rendered.querySelector("blockquote > ul > li > b > i > span")
				?.textContent,
		).toBe("Example");
		expect(rendered.querySelector("a")?.getAttribute("href")).toBe(
			"/artist/fiona-apple",
		);
	});

	test("reports an invalid preview response", async () => {
		vi.mocked(fetchInPage).mockResolvedValue("<html>Unavailable</html>");

		await expect(parseMarkup("text")).rejects.toThrow(
			"RYM preview did not contain rendered text.",
		);
	});

	test("propagates request failures", async () => {
		vi.mocked(fetchInPage).mockRejectedValue(new Error("Request failed"));

		await expect(parseMarkup("text")).rejects.toThrow("Request failed");
	});
});
