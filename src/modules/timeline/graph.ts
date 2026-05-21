import { capitalizeWords, getRoleColor } from "./roles";
import type {
	DiscoMarker,
	GraphOpts,
	MarkersByType,
	Member,
	Stint,
} from "./types";
import { escapeHtml } from "./utils";

export function buildTicksHtml(axisMin: number, axisMax: number): string {
	const total = axisMax - axisMin || 1;
	const years = [];
	for (let y = axisMin; y <= axisMax; y++) years.push(y);

	return years
		.map((y) => {
			const left = ((y - axisMin) / total) * 100;
			const major = y % 5 === 0;
			const cls = major ? "rymmt-tick rymmt-tick-major" : "rymmt-tick";
			return `<div class="${cls}" style="left:${left}%"></div>`;
		})
		.join("");
}

export function buildMarkersOverlayHtml(
	axisMin: number,
	axisMax: number,
	markers?: MarkersByType,
): string {
	const existingMarkers: MarkersByType = markers ?? {
		album: [],
		live: [],
		single: [],
		ep: [],
	};

	const total = axisMax - axisMin || 1;

	function linesFor(list: DiscoMarker[], cls: string): string {
		return list
			.filter((release) => release && Number.isFinite(release.year))
			.filter((release) => release.year >= axisMin && release.year <= axisMax)
			.map((release) => {
				const left = ((release.year - axisMin) / total) * 100;
				const title = release.title
					? `${release.year} — ${release.title}`
					: String(release.year);
				return release.url
					? `<a class="rymmt-marker ${cls}" href="${escapeHtml(release.url)}" target="_blank" rel="noopener noreferrer" style="left:${left}%" title="${escapeHtml(title)}"></a>`
					: `<div class="rymmt-marker ${cls}" style="left:${left}%" title="${escapeHtml(title)}"></div>`;
			})
			.join("");
	}

	return `<div class="rymmt-markers">
    ${linesFor(existingMarkers.album, "album")}
    ${linesFor(existingMarkers.live, "live")}
    ${linesFor(existingMarkers.ep, "ep")}
    ${linesFor(existingMarkers.single, "single")}
  </div>`;
}

// Build the role-stripe HTML for a single member bar
function buildMemberStripes(roles: string[], isDarkTheme: boolean): string {
	if (!roles.length) {
		return `<div class="rymmt-stripe rymmt-stripe-neutral"></div>`;
	}
	return roles
		.map(
			(role) =>
				`<div class="rymmt-stripe" title="${escapeHtml(role)}" style="background:${getRoleColor(role, isDarkTheme)}"></div>`,
		)
		.join("");
}

// Clamp stints to [axisMin, axisMax], dropping zero-width results
function clampStints(
	stints: Stint[],
	axisMin: number,
	axisMax: number,
): Stint[] {
	return stints
		.map((stint) => ({
			start: Math.max(
				axisMin,
				Number.isFinite(stint.start) ? stint.start : axisMin,
			),
			end: Math.min(axisMax, Number.isFinite(stint.end) ? stint.end : axisMax),
		}))
		.filter((stint) => stint.end >= stint.start);
}

// Normalize a single member's stints and year bounds relative to the graph axis
function normalizeMember(
	member: Member,
	axisMin: number,
	axisMax: number,
): Member {
	const stints: Stint[] = Array.isArray(member.stints)
		? member.stints.slice()
		: [];

	let startYear: number | null = null;
	let endYear: number | null = null;

	if (stints.length) {
		const stintStarts = stints
			.map((stint) => stint.start)
			.filter((start) => Number.isFinite(start));
		const stintEnds = stints
			.map((stint) => stint.end)
			.filter((end) => Number.isFinite(end));
		startYear = stintStarts.length ? Math.min(...stintStarts) : null;
		endYear = stintEnds.length ? Math.max(...stintEnds) : null;
	}

	if (!Number.isFinite(startYear)) startYear = axisMin;
	if (!Number.isFinite(endYear)) endYear = axisMax;

	const clamped = clampStints(stints, axisMin, axisMax);
	return {
		...member,
		roles: Array.isArray(member.roles) ? member.roles : [],
		stints: clamped.length ? clamped : stints,
		startYear,
		endYear,
	};
}

// Build the HTML for a single bar segment
function buildBarHtml(
	stint: Stint,
	axisMin: number,
	axisMax: number,
	total: number,
	stripes: string,
	rawTitle: string,
): string {
	const start = Number.isFinite(stint.start) ? stint.start : axisMin;
	const end = Number.isFinite(stint.end) ? stint.end : axisMax;

	let left = ((start - axisMin) / total) * 100;
	let width = ((end - start) / total) * 100;

	if (!Number.isFinite(left)) left = 0;
	if (!Number.isFinite(width) || width <= 0) width = 0.8;
	if (left < 0) left = 0;
	if (left > 100) left = 100;
	if (width > 100) width = 100;

	return `<div class="rymmt-bar" style="left:${left}%; width:${width}%;" title="${escapeHtml(rawTitle)}">${stripes}</div>`;
}

// Build the complete HTML row for a single member
function buildMemberRowHtml(
	member: Member,
	axisMin: number,
	axisMax: number,
	total: number,
	ticksHtml: string,
	isDarkTheme: boolean,
): string {
	const stripes = buildMemberStripes(member.roles ?? [], isDarkTheme);

	const fallbackStart =
		Number.isFinite(member.startYear) && member.startYear != null
			? member.startYear
			: axisMin;
	const fallbackEnd =
		Number.isFinite(member.endYear) && member.endYear != null
			? member.endYear
			: axisMax;

	const stints: Stint[] =
		Array.isArray(member.stints) && member.stints.length
			? member.stints.filter(
					(stint): stint is Stint =>
						!!stint &&
						Number.isFinite(stint.start) &&
						Number.isFinite(stint.end),
				)
			: [{ start: fallbackStart, end: fallbackEnd }];

	const bars = stints
		.map((stint) =>
			buildBarHtml(stint, axisMin, axisMax, total, stripes, member.raw),
		)
		.join("");

	return `<div class="rymmt-row">
        <div class="rymmt-name" title="${escapeHtml(member.name)}">${escapeHtml(member.name)}</div>
        <div class="rymmt-track">${ticksHtml}${bars}</div>
      </div>`;
}

// Collect all year values from member stints
function collectMemberStintYears(
	members: Member[],
	markerYears: number[],
): number[] {
	const allYears = [...markerYears];
	for (const member of members) {
		for (const stint of member.stints ?? []) {
			if (Number.isFinite(stint.start)) allYears.push(stint.start);
			if (Number.isFinite(stint.end)) allYears.push(stint.end);
		}
	}
	return allYears;
}

// Derive safe axisMin / axisMax from opts, members and fallbacks
function computeAxisBounds(
	members: Member[],
	opts: GraphOpts,
	nowYear: number,
): { axisMin: number; axisMax: number } {
	const formedYear = Number.isFinite(opts.formedYear)
		? Number(opts.formedYear)
		: null;
	const disbandedYear = Number.isFinite(opts.disbandedYear)
		? Number(opts.disbandedYear)
		: null;

	const markerYears: number[] = [
		...(opts.markers?.album ?? []).map((marker) => marker.year),
		...(opts.markers?.live ?? []).map((marker) => marker.year),
		...(opts.markers?.single ?? []).map((marker) => marker.year),
		...(opts.markers?.ep ?? []).map((marker) => marker.year),
	];

	const allYears = collectMemberStintYears(members, markerYears);

	let axisMin = formedYear ?? Number.NaN;
	let axisMax =
		disbandedYear ??
		(Number.isFinite(opts.endYear) ? Number(opts.endYear) : nowYear);

	if (!Number.isFinite(axisMin))
		axisMin = allYears.length ? Math.min(...allYears) : nowYear - 60;
	if (!Number.isFinite(axisMax))
		axisMax = allYears.length ? Math.max(...allYears) : nowYear;
	if (axisMin > axisMax) return { axisMin: axisMax, axisMax: axisMin };

	return { axisMin, axisMax };
}

// Build the role-chip legend HTML from a sorted role list
function buildRoleLegendHtml(roles: string[], isDarkTheme: boolean): string {
	return roles
		.map((role) => {
			const color = getRoleColor(role, isDarkTheme);
			return `<span class="rymmt-role-chip">
        <span class="rymmt-role-swatch" style="background:${color}"></span>
        ${escapeHtml(capitalizeWords(role))}
      </span>`;
		})
		.join("");
}

export function buildGraph(
	container: HTMLElement,
	members: Member[],
	opts: GraphOpts = {},
): void {
	const isDarkTheme = container?.dataset?.rymmtIsDark === "1";
	const nowYear = new Date().getFullYear();

	const { axisMin, axisMax } = computeAxisBounds(members, opts, nowYear);

	const normalizedMembers = members.map((member) =>
		normalizeMember(member, axisMin, axisMax),
	);

	const roleList = Array.from(
		new Set(normalizedMembers.flatMap((mem) => mem.roles)),
	).toSorted((a, b) => a.localeCompare(b));

	const legendHtml = buildRoleLegendHtml(roleList, isDarkTheme);

	// TODO: uncomment when release markers are actually scraped and shown on the chart
	// const releasesLegendHtml = `
	//   <span class="rymmt-role-chip">
	//     <span class="rymmt-role-swatch" style="background:var(--rymmt-album-color)"></span>
	//     Albums
	//   </span>
	//   <span class="rymmt-role-chip">
	//     <span class="rymmt-role-swatch" style="background:var(--rymmt-live-color)"></span>
	//     Live Albums
	//   </span>
	//   <span class="rymmt-role-chip">
	//     <span class="rymmt-role-swatch rymmt-release-single"></span>
	//     Singles
	//   </span>
	//   <span class="rymmt-role-chip">
	//     <span class="rymmt-role-swatch rymmt-release-ep"></span>
	//     EPs
	//   </span>
	// `;

	const safeAxisMin = axisMin;
	const safeAxisMax = axisMax;
	const ticksHtml = buildTicksHtml(safeAxisMin, safeAxisMax);
	const markersOverlayHtml = buildMarkersOverlayHtml(
		safeAxisMin,
		safeAxisMax,
		opts.markers,
	);
	const total = axisMax - axisMin || 1;
	const axisEndLabel = Number.isFinite(opts.disbandedYear)
		? String(axisMax)
		: "Now";

	const rowsHtml = normalizedMembers
		.map((member) =>
			buildMemberRowHtml(
				member,
				axisMin,
				axisMax,
				total,
				ticksHtml,
				isDarkTheme,
			),
		)
		.join("\n");

	container.innerHTML = `
    <div class="rymmt-graph">
      <div class="rymmt-graph-title">Timeline</div>
      <div class="rymmt-grid rymmt-grid-has-overlay">
        ${markersOverlayHtml}
        ${rowsHtml}
      </div>
      <div class="rymmt-axis">
        <div></div>
        <div class="rymmt-axis-track">
          <span>${escapeHtml(String(axisMin))}</span>
          <span>${escapeHtml(axisEndLabel)}</span>
        </div>
      </div>
      <div class="rymmt-legend-section">
        <div class="rymmt-legend-title">Roles</div>
        <div class="rymmt-role-legend">${legendHtml}</div>
      </div>
      <!-- TODO: uncomment when release markers are shown on the chart
      <div class="rymmt-legend-section">
        <div class="rymmt-legend-title">Releases</div>
        <div class="rymmt-role-legend">...</div>
      </div>
      -->
    </div>
  `;
}
