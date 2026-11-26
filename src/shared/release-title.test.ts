// @vitest-environment jsdom

import { afterEach, expect, test } from "vitest";
import { getReleaseTitleData } from "./release-title";

afterEach(() => document.body.replaceChildren());

test.each([
	["", '<span class="subtext">[7B]</span>', "7B", "7Б"],
	["<span>Olympia</span>", "", "7Б", undefined],
	["", "", "7Б", undefined],
	["<span> </span>", '<span class="subtext">[7B]</span>', "7B", "7Б"],
])("handles independently missing localized names: %s / %s", (titleMarkup, artistMarkup, artistName, nativeArtistName) => {
	document.body.innerHTML = `
		<div class="album_title">Олимпия ${titleMarkup}
			<span class="album_artist_small">By <a class="artist">7Б ${artistMarkup}</a></span>
		</div>`;
	const data = getReleaseTitleData();
	expect(data?.albumTitle).toBe(
		titleMarkup.includes("Olympia") ? "Olympia" : "Олимпия",
	);
	expect(data?.artistName).toBe(artistName);
	expect(data?.nativeArtistName).toBe(nativeArtistName);
});

test("preserves native names from the saved Sokrovishe release markup", () => {
	document.body.innerHTML = `
		<div class="album_title">Сокровище <span style="margin-left:5px;font-size:0.7em;">Sokrovishe</span>
			<input class="album_shortcut" value="[Album16759951]">
			<div class="album_artist_small">By <a class="artist">АукцЫон <span class="subtext">[Auction]</span></a></div>
		</div>`;
	expect(getReleaseTitleData()).toEqual({
		albumTitle: "Sokrovishe",
		artistName: "Auction",
		nativeAlbumTitle: "Сокровище",
		nativeArtistName: "АукцЫон",
	});
	const title = document.querySelector(".album_title")!;
	const wrapper = document.createElement("span");
	wrapper.className = "ebr-reference-title-text";
	for (const node of Array.from(title.childNodes)) {
		if (
			node instanceof HTMLElement &&
			node.matches(".album_shortcut, .album_artist_small")
		)
			continue;
		wrapper.append(node);
	}
	title.prepend(wrapper);
	expect(getReleaseTitleData()?.nativeAlbumTitle).toBe("Сокровище");
});

test("preserves existing metadata for releases without native alternatives", () => {
	document.body.innerHTML =
		'<div class="album_title">Example Album<div class="album_artist_small"><a class="artist">Example Artist</a></div></div>';
	expect(getReleaseTitleData()).toEqual({
		albumTitle: "Example Album",
		artistName: "Example Artist",
	});
});
