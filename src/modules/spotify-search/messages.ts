import type { SpotifySearchRequest } from "~/shared/utils/messaging";

export type SearchCategory = "albums" | "tracks";
export type SearchInput = SpotifySearchRequest["data"];
export type SearchResult =
	| { status: "found"; url: string }
	| { status: "not-found" }
	| { status: "error"; message: string };

export type FrameRequest = {
	type: "ebr-spotify-read";
	id: string;
	category: SearchCategory;
	data: SearchInput;
};

export const isSearchInput = (value: unknown): value is SearchInput =>
	typeof value === "object" &&
	value !== null &&
	"artist" in value &&
	typeof value.artist === "string" &&
	"title" in value &&
	typeof value.title === "string" &&
	(!("releaseType" in value) ||
		value.releaseType === undefined ||
		value.releaseType === "single" ||
		value.releaseType === "music video");

export const isSearchResult = (value: unknown): value is SearchResult => {
	if (typeof value !== "object" || value === null || !("status" in value))
		return false;
	switch (value.status) {
		case "not-found":
			return true;
		case "found":
			return (
				"url" in value &&
				typeof value.url === "string" &&
				/^https:\/\/open\.spotify\.com\/(?:album|track)\/[a-zA-Z0-9]{22}$/.test(
					value.url,
				)
			);
		case "error":
			return "message" in value && typeof value.message === "string";
		default:
			return false;
	}
};

export const isFrameRequest = (value: unknown): value is FrameRequest =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "ebr-spotify-read" &&
	"id" in value &&
	typeof value.id === "string" &&
	"category" in value &&
	(value.category === "albums" || value.category === "tracks") &&
	"data" in value &&
	isSearchInput(value.data);
