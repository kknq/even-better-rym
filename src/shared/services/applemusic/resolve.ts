import { asArray } from "~/shared/utils/array";
import { stringToDate } from "~/shared/utils/datetime";
import { fetch } from "~/shared/utils/fetch";
import { getReleaseType } from "~/shared/utils/music";
import { pipe } from "~/shared/utils/pipe";
import { ifDefined } from "~/shared/utils/types";

import type {
	ReleaseAttribute,
	ReleaseFormat,
	ReleaseLabel,
	ReleaseType,
	ResolveFunction,
	Track,
} from "../types";
import type { MusicVideoData, ReleaseData } from "./codec";
import { convertAppleMusicDuration } from "./convert";

const FULL_IMAGE_SIZE = "3000x3000bb.jpg";

const getReleaseData = (document_: Document) => {
	const releaseScript = document_.querySelector<HTMLScriptElement>(
		String.raw`script#schema\:music-album`,
	);
	if (releaseScript) return JSON.parse(releaseScript.text) as ReleaseData;

	const musicVideoScript = document_.querySelector<HTMLScriptElement>(
		String.raw`script#schema\:music-video`,
	);
	if (musicVideoScript)
		return JSON.parse(musicVideoScript.text) as MusicVideoData;

	throw new Error(`Could not get release data for URL ${document_.URL}`);
};

type ResolvedFields = {
	artists: string[];
	title: string;
	type: ReleaseType;
	format: ReleaseFormat | undefined;
	attributes: ReleaseAttribute[];
	coverArt: string[] | undefined;
	tracks: Track[] | undefined;
	label: ReleaseLabel | undefined;
};

const resolveMusicVideoFields = (release: MusicVideoData): ResolvedFields => ({
	artists: release.creator.map((c) => c.name),
	title: release.name,
	type: "music video",
	format: undefined,
	attributes: [],
	coverArt: [
		release.video.thumbnailUrl,
		release.image.replace("{w}x{h}mv", FULL_IMAGE_SIZE),
	],
	tracks: undefined,
	label: undefined,
});

const parseTitleAndType = (
	title: string,
	defaultType: ReleaseType,
): { title: string; type: ReleaseType } => {
	if (title.includes(" - EP"))
		return { title: title.replace(" - EP", ""), type: "ep" };
	if (title.includes(" - Single"))
		return { title: title.replace(" - Single", ""), type: "single" };
	return { title, type: defaultType };
};

const parseLabelAndType = (
	document_: Document,
	currentType: ReleaseType,
): { label: ReleaseLabel | undefined; type: ReleaseType } => {
	const descEl = document_.querySelector(
		'[data-testid="tracklist-footer-description"]',
	);
	if (!descEl) return { label: undefined, type: currentType };

	const lines = (descEl.textContent ?? "").split("\n");
	if (lines.length !== 3) return { label: undefined, type: currentType };

	const type = lines[2]?.includes("This Compilation")
		? "compilation"
		: currentType;
	const labelLine = lines[2]
		?.replace("℗", "")
		.replaceAll(/20\d\d/g, "")
		.replaceAll(/19\d\d/g, "")
		.replace("This Compilation", "")
		.trim();

	return {
		label: labelLine ? { name: labelLine, catno: "" } : undefined,
		type,
	};
};

const resolveAlbumFields = (
	release: ReleaseData,
	document_: Document,
): ResolvedFields => {
	const tracks = release.tracks.map((t, i) => ({
		position: String(i + 1),
		title: t.name,
		duration: ifDefined(convertAppleMusicDuration)(t.duration),
	}));

	const { title, type: titleType } = parseTitleAndType(
		release.name,
		getReleaseType(release.tracks.length),
	);
	const { label, type } = parseLabelAndType(document_, titleType);

	const attributes: ReleaseAttribute[] = ["streaming"];
	const isDownloadable =
		document_.querySelector('button[aria-label$="iTunes Store"]') !== null;
	if (isDownloadable) attributes.push("downloadable");

	const coverArt = asArray(
		pipe(
			document_.querySelector<HTMLMetaElement>('meta[property="og:image"]') ??
				undefined,
			ifDefined((el) =>
				el.content.replace(/\d+x\d+wp-\d+\.jpg/, FULL_IMAGE_SIZE),
			),
		),
	);

	return {
		artists: release.byArtist.map((a) => a.name),
		title,
		type,
		format: "lossless digital",
		attributes,
		coverArt,
		tracks,
		label,
	};
};

export const resolve: ResolveFunction = async (url) => {
	const response = await fetch({ url });
	const document_ = new DOMParser().parseFromString(response, "text/html");
	const release = getReleaseData(document_);

	const url_ = release.url;
	const date = stringToDate(
		release["@type"] === "MusicAlbum"
			? release.datePublished
			: release.dateCreated,
	);

	const fields =
		release["@type"] === "MusicVideoObject"
			? resolveMusicVideoFields(release)
			: resolveAlbumFields(release, document_);

	return { url: url_, date, ...fields };
};
