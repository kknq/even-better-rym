import type { ResolveData } from "~/shared/services/types";

import { fillFiledUnderCredits } from "./credits";
import {
	fillArtists,
	fillAttributes,
	fillClassifiers,
	fillCountries,
	fillDate,
	fillDiscSize,
	fillFormat,
	fillLabel,
	fillSource,
	fillTitle,
	fillTracks,
	fillType,
} from "./fillers";
import type { ReleaseOptions } from "./types";

type FillField = keyof ReleaseOptions["fillFields"];

export type FieldFiller<K extends keyof ResolveData> = {
	/** Option that enables this field; fields without a toggle always fill. */
	toggle?: FillField;
	fill: (
		value: NonNullable<ResolveData[K]>,
		data: ResolveData,
		options: ReleaseOptions,
	) => void | Promise<void>;
};

export type FieldFillers = { [K in keyof ResolveData]?: FieldFiller<K> };

/** Fields are filled in declaration order. */
export const FIELD_FILLERS: FieldFillers = {
	artists: {
		fill: (artists, data, { fillFields }) =>
			// Always reset the artist picker, even when artist importing is disabled.
			fillArtists(fillFields.artists ? artists : [], data.artistMode),
	},
	type: { toggle: "type", fill: fillType },
	date: { toggle: "date", fill: fillDate },
	title: {
		toggle: "title",
		fill: (title, _data, { capitalization }) =>
			fillTitle(title, capitalization),
	},
	format: { toggle: "format", fill: fillFormat },
	discSize: { toggle: "discSize", fill: fillDiscSize },
	label: { toggle: "label", fill: fillLabel },
	attributes: { toggle: "attributes", fill: fillAttributes },
	tracks: {
		toggle: "tracks",
		fill: (tracks, _data, { capitalization, preserveTrackLengths }) =>
			fillTracks(tracks, capitalization, preserveTrackLengths),
	},
	url: { fill: fillSource },
	countries: { toggle: "countries", fill: fillCountries },
	classifiers: { fill: fillClassifiers },
	filedUnderCreditRole: { toggle: "credits", fill: fillFiledUnderCredits },
};
