import { secondsToString, stringToDate } from "~/shared/utils/datetime";
import { fetch } from "~/shared/utils/fetch";

import { DJ_MIX_RELEASE_DEFAULTS } from "../dj-mix";
import type { ResolveFunction } from "../types";
import { MIXCLOUD_REGEX } from "./regex";

function object(value: unknown): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error("Could not parse Mixcloud show details");
	}
	return value as Record<string, unknown>;
}

function text(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getCoverArt(pictures: unknown): string[] | undefined {
	if (pictures == null) return undefined;
	const images = object(pictures);
	const image =
		text(images.extra_large) ?? text(images.large) ?? text(images.medium);
	if (!image) return undefined;
	const url = new URL(image);
	if (
		url.hostname === "thumbnailer.mixcloud.com" &&
		url.pathname.startsWith("/unsafe/")
	) {
		url.pathname = url.pathname.replace(
			/^\/unsafe\/(?:\d+x\d+\/)?(?:filters:.*\/)?(?=extaudio\/)/,
			"/unsafe/",
		);
	}
	return [url.href];
}

export const resolve: ResolveFunction = async (url) => {
	const match = MIXCLOUD_REGEX.exec(url);
	if (!match) throw new Error("Unsupported Mixcloud show URL");
	const path = `/${match[1]}/${match[2]}/`;
	const response = await fetch({ url: `https://api.mixcloud.com${path}` });
	const data = object(JSON.parse(response) as unknown);
	if (data.error) {
		throw new Error("Mixcloud could not return this show");
	}
	const title = text(data.name);
	const artist = text(object(data.user).name);
	if (!title || !artist) {
		throw new Error("Could not find Mixcloud show details");
	}
	const duration = data.audio_length;
	if (
		typeof duration !== "number" ||
		!Number.isFinite(duration) ||
		duration <= 0
	) {
		throw new Error("Could not parse Mixcloud mix duration");
	}
	const dateText = text(data.created_time);
	if (
		dateText &&
		(!/^\d{4}-\d{2}-\d{2}T/.test(dateText) ||
			Number.isNaN(Date.parse(dateText)))
	) {
		throw new Error("Could not parse Mixcloud upload date");
	}

	return {
		url: `https://www.mixcloud.com${path}`,
		title,
		artists: [artist],
		artistMode: "text",
		date: dateText ? stringToDate(dateText) : undefined,
		type: "dj mix",
		format: "digital file",
		attributes: ["streaming"],
		...DJ_MIX_RELEASE_DEFAULTS,
		tracks: [{ position: "1", title, duration: secondsToString(duration) }],
		coverArt: getCoverArt(data.pictures),
	};
};
