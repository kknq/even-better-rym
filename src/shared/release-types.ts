export const releaseTypes = {
	s: {
		label: "Albums",
		timelineType: "album",
		chart: { id: "album", singularLabel: "Album" },
	},
	l: { label: "Live albums", timelineType: "live" },
	m: { label: "Mixtapes", chart: { id: "mixtape", singularLabel: "Mixtape" } },
	e: {
		label: "EPs",
		timelineType: "ep",
		chart: { id: "ep", singularLabel: "EP" },
	},
	i: {
		label: "Singles",
		timelineType: "single",
		chart: { id: "single", singularLabel: "Single" },
	},
	o: {
		label: "Music videos",
		collectionLabel: "Music Videos",
		chart: { id: "musicvideo", singularLabel: "Music Video" },
	},
	j: {
		label: "DJ mixes",
		collectionLabel: "DJ Mixes",
		chart: { id: "djmix", singularLabel: "DJ Mix" },
	},
	a: { label: "Appears on" },
	c: {
		label: "Compilations",
		chart: { id: "comp", singularLabel: "Compilation" },
	},
	v: { label: "V/A compilations" },
	b: {
		label: "Bootlegs / Unauthorized",
		collectionLabel: "Bootlegs",
		chart: {
			id: "unauth",
			singularLabel: "Unauthorized",
			label: "Unauth/Bootlegs",
		},
	},
	d: { label: "Videos", chart: { id: "video", singularLabel: "Video" } },
	x: {
		label: "Additional releases",
		collectionLabel: "Additional Releases",
		timelineType: "additional",
		chart: { id: "additional", singularLabel: "Additional Release" },
	},
} as const;

export type ReleaseType = keyof typeof releaseTypes;

const collectionTypeIds = [
	"s",
	"e",
	"i",
	"o",
	"m",
	"j",
	"c",
	"d",
	"b",
	"x",
] as const satisfies readonly ReleaseType[];

export const collectionReleaseTypes = collectionTypeIds.map((id) => {
	const type = releaseTypes[id];
	return {
		id,
		label: "collectionLabel" in type ? type.collectionLabel : type.label,
		modifier: `typ${id}`,
	};
});

export const timelineReleaseTypes = Object.entries(releaseTypes).flatMap(
	([id, type]) =>
		"timelineType" in type
			? [{ id: id as ReleaseType, type: type.timelineType }]
			: [],
);

export type TimelineReleaseType = (typeof timelineReleaseTypes)[number]["type"];

export const chartReleaseTypes = Object.values(releaseTypes).flatMap((type) =>
	"chart" in type
		? [
				{
					...type.chart,
					label: "label" in type.chart ? type.chart.label : type.label,
				},
			]
		: [],
);

export const chartReleaseTypeLabels: Record<string, string> =
	Object.fromEntries([
		...chartReleaseTypes.map((type) => [type.id, type.label] as const),
		["song", "Songs"] as const,
	]);

export const chartReleaseTypeSingularLabels: Record<string, string> =
	Object.fromEntries([
		...chartReleaseTypes.map((type) => [type.id, type.singularLabel] as const),
		["song", "Song"] as const,
	]);
