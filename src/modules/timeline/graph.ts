import { currentDecimalYear } from "./date-utils";
import { buildChartRoleColorMap, capitalizeWords } from "./roles";
import type { GraphOpts, MarkersByType, Member, Stint } from "./types";
import { escapeHtml } from "./utils";

export function buildTicksHtml(axisMin: number, axisMax: number): string {
	const total = axisMax - axisMin || 1;
	const startYear = Math.ceil(axisMin);
	const endYear = Math.floor(axisMax);
	const years: number[] = [];
	for (let y = startYear; y <= endYear; y++) years.push(y);

	return years
		.map((y) => {
			const left = ((y - axisMin) / total) * 100;
			const major = y % 5 === 0;
			const cls = major ? "rymmt-tick rymmt-tick-major" : "rymmt-tick";
			return `<div class="${cls}" style="left:${left}%"></div>`;
		})
		.join("");
}

const DISCO_TYPE_LABELS: Record<string, string> = {
	album: "LP",
	live: "Live",
	ep: "EP",
	single: "Single",
	additional: "Add.",
	show: "Show",
};

export function buildMarkersOverlayHtml(
	axisMin: number,
	axisMax: number,
	markers?: MarkersByType,
): string {
	if (!markers) return `<div class="rymmt-markers-global"></div>`;

	const total = axisMax - axisMin || 1;

	// Group all markers by year; one entry per individual release for the tooltip
	const yearMap = new Map<number, { type: string; title: string }[]>();
	for (const [type, list] of Object.entries(markers)) {
		for (const marker of list) {
			if (!Number.isFinite(marker.year)) continue;
			if (marker.year < axisMin || marker.year > axisMax) continue;
			if (!yearMap.has(marker.year)) yearMap.set(marker.year, []);
			yearMap.get(marker.year)!.push({ type, title: marker.title });
		}
	}

	if (yearMap.size === 0) return `<div class="rymmt-markers-global"></div>`;

	const groups = [...yearMap.keys()]
		.toSorted((a, b) => a - b)
		.map((year) => {
			const left = ((year - axisMin) / total) * 100;
			const entries = yearMap.get(year)!;

			const tooltipText = entries
				.map((e) =>
					e.type === "show"
						? e.title
						: `${e.title} (${DISCO_TYPE_LABELS[e.type] ?? e.type})`,
				)
				.join("\n");
			// One color segment per unique type at this year
			const seenTypes = new Set<string>();
			const segments = entries
				.filter((e) => {
					const isNew = !seenTypes.has(e.type);
					seenTypes.add(e.type);
					return isNew;
				})
				.map(
					(e) =>
						`<div class="rymmt-mseg rymmt-mseg-${escapeHtml(e.type)}"></div>`,
				)
				.join("");

			return `<div class="rymmt-mgroup" style="left:${left}%" title="${escapeHtml(tooltipText)}">${segments}</div>`;
		});

	return `<div class="rymmt-markers-global">${groups.join("")}</div>`;
}

// Build the role-stripe HTML for a single member bar
function buildMemberStripes(
	roles: string[],
	colorMap: Map<string, string>,
): string {
	if (!roles.length) {
		return `<div class="rymmt-stripe rymmt-stripe-neutral"></div>`;
	}
	const allRolesTitle = escapeHtml(roles.join(", "));
	return roles
		.map(
			(role) =>
				`<div class="rymmt-stripe" title="${allRolesTitle}" style="background:${colorMap.get(role) ?? "transparent"}"></div>`,
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
	colorMap: Map<string, string>,
): string {
	const stripes = buildMemberStripes(member.roles ?? [], colorMap);

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

	const linkTitle = member.title ?? member.name;
	const nameContent = member.url
		? `<a href="${escapeHtml(member.url)}" class="rymmt-name-link" title="${escapeHtml(
				linkTitle,
			)}">${escapeHtml(member.name)}</a>`
		: escapeHtml(member.name);

	return `<div class="rymmt-row">
        <div class="rymmt-name" title="${escapeHtml(member.name)}">${nameContent}</div>
        <div class="rymmt-track">${bars}</div>
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
): { axisMin: number; axisMax: number; axisMinKnown: boolean } {
	const formedYear = Number.isFinite(opts.formedYear)
		? Number(opts.formedYear)
		: null;
	const disbandedYear = Number.isFinite(opts.disbandedYear)
		? Number(opts.disbandedYear)
		: null;

	// Marker years contribute integer bounds (floor) so axis ticks stay on whole years
	const markerYears: number[] = [
		...(opts.markers?.album ?? []).map((marker) => Math.floor(marker.year)),
		...(opts.markers?.live ?? []).map((marker) => Math.floor(marker.year)),
		...(opts.markers?.single ?? []).map((marker) => Math.floor(marker.year)),
		...(opts.markers?.ep ?? []).map((marker) => Math.floor(marker.year)),
		...(opts.markers?.additional ?? []).map((marker) =>
			Math.floor(marker.year),
		),
		...(opts.markers?.show ?? []).map((marker) => Math.floor(marker.year)),
	];

	const allYears = collectMemberStintYears(members, markerYears);

	const axisMinKnown = formedYear !== null;
	let axisMin = formedYear ?? Number.NaN;
	let axisMax =
		disbandedYear ??
		(Number.isFinite(opts.endYear) ? Number(opts.endYear) : nowYear);

	if (!Number.isFinite(axisMin))
		axisMin = allYears.length ? Math.min(...allYears) : nowYear;
	if (!Number.isFinite(axisMax))
		axisMax = allYears.length ? Math.max(...allYears) : nowYear;
	if (axisMin > axisMax)
		return { axisMin: axisMax, axisMax: axisMin, axisMinKnown };

	return { axisMin, axisMax, axisMinKnown };
}

// Build the releases legend HTML - only shows types that have at least one marker
// Each chip is a toggle button with data-rymmt-type for JS interactivity
function buildReleasesLegendHtml(markers?: MarkersByType): string {
	if (!markers) return "";
	const chips: string[] = [];
	if (markers.album.length) {
		chips.push(
			`<button class="rymmt-role-chip rymmt-release-chip" data-rymmt-type="album" title="Click to hide/show Albums"><span class="rymmt-role-swatch" style="background:var(--rymmt-album-color)"></span>Albums</button>`,
		);
	}
	if (markers.live.length) {
		chips.push(
			`<button class="rymmt-role-chip rymmt-release-chip" data-rymmt-type="live" title="Click to hide/show Live Albums"><span class="rymmt-role-swatch" style="background:var(--rymmt-live-color)"></span>Live Albums</button>`,
		);
	}
	if (markers.ep.length) {
		chips.push(
			`<button class="rymmt-role-chip rymmt-release-chip" data-rymmt-type="ep" title="Click to hide/show EPs"><span class="rymmt-role-swatch" style="background:var(--rymmt-ep-color)"></span>EPs</button>`,
		);
	}
	if (markers.single.length) {
		chips.push(
			`<button class="rymmt-role-chip rymmt-release-chip" data-rymmt-type="single" title="Click to hide/show Singles"><span class="rymmt-role-swatch" style="background:var(--rymmt-single-color)"></span>Singles</button>`,
		);
	}
	if (markers.additional.length) {
		chips.push(
			`<button class="rymmt-role-chip rymmt-release-chip" data-rymmt-type="additional" title="Click to hide/show Additional"><span class="rymmt-role-swatch" style="background:var(--rymmt-additional-color)"></span>Additional</button>`,
		);
	}
	if (markers.show.length) {
		chips.push(
			`<button class="rymmt-role-chip rymmt-release-chip" data-rymmt-type="show" title="Click to hide/show Shows"><span class="rymmt-role-swatch" style="background:var(--rymmt-show-color)"></span>Shows</button>`,
		);
	}
	return chips.join("");
}

// Build the role-chip legend HTML from a sorted role list
function buildRoleLegendHtml(
	roles: string[],
	colorMap: Map<string, string>,
): string {
	return roles
		.map((role) => {
			const color = colorMap.get(role) ?? "transparent";
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
	const nowYear = currentDecimalYear();

	const { axisMin, axisMax, axisMinKnown } = computeAxisBounds(
		members,
		opts,
		nowYear,
	);

	const normalizedMembers = members.map((member) =>
		normalizeMember(member, axisMin, axisMax),
	);

	const roleList = Array.from(
		new Set(normalizedMembers.flatMap((mem) => mem.roles)),
	).toSorted((a, b) => a.localeCompare(b));

	const chartColorMap = buildChartRoleColorMap(roleList, isDarkTheme);
	const legendHtml = buildRoleLegendHtml(roleList, chartColorMap);

	const releasesLegendHtml = buildReleasesLegendHtml(opts.markers);

	const safeAxisMin = axisMin;
	const safeAxisMax = axisMax;
	const ticksHtml = buildTicksHtml(safeAxisMin, safeAxisMax);
	const markersOverlayHtml = buildMarkersOverlayHtml(
		safeAxisMin,
		safeAxisMax,
		opts.markers,
	);
	const total = axisMax - axisMin || 1;
	const axisStartLabel =
		opts.axisStartLabel ??
		(axisMinKnown ? String(Math.floor(axisMin)) : "First Release");
	const axisEndLabel =
		opts.axisEndLabel ??
		(Number.isFinite(opts.disbandedYear) ? String(Math.floor(axisMax)) : "Now");

	const rowsHtml = normalizedMembers
		.map((member) =>
			buildMemberRowHtml(member, axisMin, axisMax, total, chartColorMap),
		)
		.join("\n");

	container.innerHTML = `
    <div class="rymmt-graph">
      <div class="rymmt-graph-titlebar">
        <span class="rymmt-graph-title">Timeline</span>
        <button class="rymmt-btn rymmt-fs-btn" title="Expand to fullscreen" aria-label="Expand to fullscreen">&#x26F6;</button>
        <button class="rymmt-btn rymmt-fs-close-btn" title="Exit fullscreen" aria-label="Exit fullscreen">&#x2715; Exit fullscreen</button>
      </div>
      <div class="rymmt-grid rymmt-grid-has-overlay">
        ${rowsHtml}
        ${markersOverlayHtml}
        <div class="rymmt-ticks">${ticksHtml}</div>
      </div>
      <div class="rymmt-axis">
        <div></div>
        <div class="rymmt-axis-track">
          <span>${escapeHtml(axisStartLabel)}</span>
          <span>${escapeHtml(axisEndLabel)}</span>
        </div>
      </div>
      <div class="rymmt-legend-section">
        <div class="rymmt-legend-title">Roles</div>
        <div class="rymmt-role-legend">${legendHtml}</div>
      </div>
      ${releasesLegendHtml ? `<div class="rymmt-legend-section"><div class="rymmt-legend-title">Releases <span class="rymmt-legend-hint">(click to toggle)</span></div><div class="rymmt-role-legend">${releasesLegendHtml}</div></div>` : ""}
    </div>
  `;
}

export function attachGraphInteractivity(panel: HTMLElement): void {
	// Types hidden on initial open (only Albums shown by default)
	const INITIALLY_HIDDEN = new Set([
		"live",
		"ep",
		"single",
		"additional",
		"show",
	]);
	const hiddenTypes = new Set<string>(INITIALLY_HIDDEN);

	// Re-evaluate each mgroup: hide it entirely when every one of its segments
	function refreshMgroupVisibility(): void {
		panel.querySelectorAll<HTMLElement>(".rymmt-mgroup").forEach((group) => {
			const segs = group.querySelectorAll(".rymmt-mseg");
			if (!segs.length) return;
			const allHidden = Array.from(segs).every((seg) => {
				for (const cls of seg.classList) {
					if (cls.startsWith("rymmt-mseg-")) {
						return hiddenTypes.has(cls.slice("rymmt-mseg-".length));
					}
				}
				return false;
			});
			group.style.display = allHidden ? "none" : "";
		});
	}

	// Apply initial hidden state
	for (const type of INITIALLY_HIDDEN) {
		panel.setAttribute(`data-hide-${type}`, "");
	}
	panel
		.querySelectorAll<HTMLElement>(".rymmt-release-chip[data-rymmt-type]")
		.forEach((chip) => {
			if (hiddenTypes.has(chip.dataset.rymmtType ?? "")) {
				chip.classList.add("rymmt-chip-inactive");
			}
		});
	refreshMgroupVisibility();

	// Release-type legend chips toggle the corresponding marker segments
	panel
		.querySelectorAll<HTMLElement>(".rymmt-release-chip[data-rymmt-type]")
		.forEach((chip) => {
			chip.addEventListener("click", () => {
				const type = chip.dataset.rymmtType;
				if (!type) return;
				const attrName = `data-hide-${type}`;
				if (hiddenTypes.has(type)) {
					hiddenTypes.delete(type);
					panel.removeAttribute(attrName);
					chip.classList.remove("rymmt-chip-inactive");
				} else {
					hiddenTypes.add(type);
					panel.setAttribute(attrName, "");
					chip.classList.add("rymmt-chip-inactive");
				}
				refreshMgroupVisibility();
			});
		});

	// Fullscreen expand / close
	panel.querySelector(".rymmt-fs-btn")?.addEventListener("click", () => {
		panel.classList.add("rymmt-fs");
		document.body.classList.add("rymmt-fs-open");
		panel.scrollTop = 0;
	});
	panel.querySelector(".rymmt-fs-close-btn")?.addEventListener("click", () => {
		panel.classList.remove("rymmt-fs");
		document.body.classList.remove("rymmt-fs-open");
	});
}
