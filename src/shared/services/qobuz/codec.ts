type Artist = { name: string; roles: string[] };

export type QobuzTrack = {
	id: number;
	title: string;
	version?: string;
	duration: number;
	track_number: number;
	media_number: number;
	performer?: Artist;
	composer?: Artist;
	performers?: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isPositiveInteger = (value: unknown): value is number =>
	typeof value === "number" && Number.isSafeInteger(value) && value > 0;

function optionalText(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value !== "string")
		throw new Error("Could not parse Qobuz text metadata");
	return value;
}

function readArtist(value: unknown): Artist {
	if (
		!isObject(value) ||
		typeof value.name !== "string" ||
		!value.name.trim() ||
		(value.roles !== undefined &&
			(!Array.isArray(value.roles) ||
				value.roles.some(
					(role: unknown) => typeof role !== "string" || !role.trim(),
				)))
	) {
		throw new Error("Could not parse Qobuz artist");
	}
	const roles: unknown[] = value.roles ?? [];
	return {
		name: value.name.trim(),
		roles: roles.map((role) => {
			if (typeof role !== "string")
				throw new Error("Could not parse Qobuz artist role");
			return role;
		}),
	};
}

function readTrack(value: unknown): QobuzTrack {
	if (
		!isObject(value) ||
		!isPositiveInteger(value.id) ||
		typeof value.title !== "string" ||
		!value.title.trim() ||
		typeof value.duration !== "number" ||
		!Number.isFinite(value.duration) ||
		value.duration < 0 ||
		!isPositiveInteger(value.track_number) ||
		!isPositiveInteger(value.media_number)
	) {
		throw new Error("Could not parse Qobuz track");
	}
	return {
		id: value.id,
		title: value.title,
		version: optionalText(value.version),
		duration: value.duration,
		track_number: value.track_number,
		media_number: value.media_number,
		performer:
			value.performer == null ? undefined : readArtist(value.performer),
		composer: value.composer == null ? undefined : readArtist(value.composer),
		performers: optionalText(value.performers),
	};
}

export function readAlbum(value: unknown, id: string, offset: number) {
	if (isObject(value) && value.status === "error") {
		throw new Error(
			`Qobuz import failed: ${typeof value.message === "string" ? value.message : "Metadata request rejected"}`,
		);
	}
	if (
		!isObject(value) ||
		value.id !== id ||
		typeof value.title !== "string" ||
		!value.title.trim() ||
		!isPositiveInteger(value.tracks_count) ||
		!isPositiveInteger(value.media_count) ||
		!isObject(value.tracks) ||
		value.tracks.offset !== offset ||
		value.tracks.total !== value.tracks_count ||
		!isPositiveInteger(value.tracks.limit) ||
		!Array.isArray(value.tracks.items)
	) {
		throw new Error("Could not parse Qobuz album or track pagination");
	}
	if (value.artists != null && !Array.isArray(value.artists)) {
		throw new Error("Could not parse Qobuz album artists");
	}
	const artists: unknown[] = value.artists ?? [];
	if (value.image != null && !isObject(value.image)) {
		throw new Error("Could not parse Qobuz cover metadata");
	}
	const items: unknown[] = value.tracks.items;
	return {
		title: value.title,
		version: optionalText(value.version),
		artist: value.artist == null ? undefined : readArtist(value.artist),
		artists: artists.map(readArtist),
		tracksCount: value.tracks_count,
		mediaCount: value.media_count,
		date: optionalText(
			value.release_date_original ??
				value.release_date_download ??
				value.release_date_stream,
		),
		cover: optionalText(value.image?.large),
		label: value.label == null ? undefined : readArtist(value.label).name,
		tracks: items.map(readTrack),
	};
}
