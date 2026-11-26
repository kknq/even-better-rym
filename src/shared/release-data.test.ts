// @vitest-environment jsdom

import { afterEach, describe, expect, test } from "vitest";

import { findReleaseIssue, isSupportedReleasePagePath } from "./release-data";

afterEach(() => {
	document.head.replaceChildren();
	document.body.replaceChildren();
});

test("reads the Sokrovishche CD issue without a catalogue number", () => {
	document.head.innerHTML = '<meta itemprop="name" content="Сокровище">';
	document.body.innerHTML = `
		<a class="artist">АукцЫон <span class="subtext">[Auction]</span></a>
		<li class="issue_info current">
			<span class="issue_label" title="Улитка "></span>
			<span class="issue_formats" title="CD "></span>
			<span class="issue_year" title="2025"></span>
		</li>`;
	expect(findReleaseIssue()).toMatchObject({
		catalogNumber: "",
		artist: "АукцЫон",
		title: "Сокровище",
		format: "CD ",
		year: 2025,
	});
});
test("preserves slashes within the saved Oxxxymiron catalogue number", () => {
	document.head.innerHTML = '<meta itemprop="name" content="Вечный жид">';
	document.body.innerHTML = `
		<a class="artist">Oxxxymiron</a>
		<li class="issue_info current">
			<span class="issue_label" title="NMDC / МДС-CD 047/11"></span>
			<span class="issue_formats" title="CD"></span>
			<span class="issue_year" title="15 September 2011"></span>
		</li>`;
	expect(findReleaseIssue()).toMatchObject({
		catalogNumber: "МДС-CD 047/11",
		label: "NMDC",
		artist: "Oxxxymiron",
		title: "Вечный жид",
		year: 2011,
	});
});

describe("isSupportedReleasePagePath", () => {
	test("accepts music release pages", () => {
		expect(isSupportedReleasePagePath("/release/artist/title/123456/")).toBe(
			true,
		);
	});

	test("rejects dedicated release review listings", () => {
		expect(
			isSupportedReleasePagePath("/release/artist/title/123456/reviews/"),
		).toBe(false);
	});

	test("rejects unrelated routes", () => {
		expect(isSupportedReleasePagePath("/film/artist/title/123456/")).toBe(
			false,
		);
	});
});
