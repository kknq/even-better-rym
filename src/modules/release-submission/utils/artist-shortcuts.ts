import { arrayToArtists } from "~/shared/utils/string";

const TRACK_TITLE_ID_PATTERN = /^track_track_title\d+$/;
const ARTIST_SEPARATOR = " - ";
const ARTIST_LIST_DELIMITER = /\s*&\s*|\s*,\s*/;
const ARTIST_LINK_PATTERN = /\[Artist\d+]/;

export const isTrackTitleFieldId = (id: string): boolean =>
	TRACK_TITLE_ID_PATTERN.test(id);

export const buildArtistToken = (assocId: string, text?: string): string =>
	text ? `[Artist${assocId},${text}]` : `[Artist${assocId}]`;

// Appends artistToken to the field's existing linked artist list (if any),
// leaving the track name and any unlinked artist text untouched.
export const insertArtistShortcut = (
	currentValue: string,
	artistToken: string,
): string => {
	const separatorIndex = currentValue.indexOf(ARTIST_SEPARATOR);
	const artistListPart =
		separatorIndex === -1
			? currentValue
			: currentValue.slice(0, separatorIndex);

	// No existing [ArtistXXXX] link before the separator: nothing to parse or
	// join, so the whole field is treated as the track name.
	if (!ARTIST_LINK_PATTERN.test(artistListPart)) {
		return `${artistToken}${ARTIST_SEPARATOR}${currentValue}`;
	}

	const trackNamePart = currentValue.slice(
		separatorIndex + ARTIST_SEPARATOR.length,
	);
	const artists = artistListPart
		.split(ARTIST_LIST_DELIMITER)
		.filter((artist) => artist.length > 0);
	artists.push(artistToken);

	return `${arrayToArtists(artists)}${ARTIST_SEPARATOR}${trackNamePart}`;
};
