import { normalizeCreditRole } from "../credit-roles";
import type { TrackCredit } from "../types";
import type { QobuzTrack } from "./codec";

export function readTrackCredits(track: QobuzTrack, releaseArtists: string[]) {
	const artists = new Set(track.performer ? [track.performer.name] : []);
	const credits: TrackCredit[] = [];
	const knownNames = [
		...releaseArtists,
		...(track.performer ? [track.performer.name] : []),
		...(track.composer ? [track.composer.name] : []),
	].sort((a, b) => b.length - a.length);
	let remaining = track.performers?.trimStart() ?? "";
	if (!remaining.trim()) {
		remaining = "";
		if (track.composer) {
			credits.push({
				name: track.composer.name,
				role: normalizeCreditRole("Composer"),
			});
		}
	}
	while (remaining) {
		const knownName = knownNames.find((name) =>
			remaining.startsWith(`${name},`),
		);
		const comma = knownName?.length ?? remaining.indexOf(",");
		if (comma < 1) throw new Error("Could not parse Qobuz track contributors");
		const next = remaining.indexOf(" - ", comma + 1);
		const record = next === -1 ? remaining : remaining.slice(0, next);
		const name = record.slice(0, comma).trim();
		const roles = record
			.slice(comma + 1)
			.split(",")
			.map((role) => role.trim());
		if (!name || roles.some((role) => !role)) {
			throw new Error("Could not parse Qobuz track contributor roles");
		}
		for (const sourceRole of roles) {
			const role = normalizeCreditRole(sourceRole);
			const mainArtist =
				sourceRole.replace(/[\s_-]+/g, "").toLowerCase() === "mainartist";
			if (mainArtist || role === "featured") artists.add(name);
			if (!mainArtist) credits.push({ name, role });
		}
		remaining = next === -1 ? "" : remaining.slice(next + 3).trimStart();
		if (next !== -1 && !remaining.trim()) {
			throw new Error("Could not parse Qobuz track contributors");
		}
	}
	return { artists: [...artists], credits };
}
