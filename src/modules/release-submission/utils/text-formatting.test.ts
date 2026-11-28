import { expect, test } from "vitest";

import { formatImportedText } from "./text-formatting";

test("applies unambiguous text formatting to imported text", () => {
	expect(
		formatImportedText(
			"Ａｌｂｕｍ ‘one’ “two” – three — four | {mix} <live>\u200B\u2060\uFEFF",
		),
	).toBe("Album 'one' \"two\" - three - four / (mix) (live)");
});

test("preserves editorial brackets, markup and meaningful Unicode", () => {
	const text =
		"[bonus track] [b]Title[/b] [Artist123] Café 日本語 💯 👩‍🎤 a\u200Cb ℝ";
	expect(formatImportedText(text)).toBe(text);
});

test("leaves unpaired delimiters and non-Latin full-width characters alone", () => {
	expect(formatImportedText("<3 {unfinished Ａ３！")).toBe(
		"<3 {unfinished A３！",
	);
});
