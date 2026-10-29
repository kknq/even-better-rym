import { useEffect, useState } from "preact/hooks";
import type { ResolveData, Track } from "~/shared/services/types";
import { loadCreditSuggestions } from "../utils/load-credit-suggestions";
import { reportSubmissionError } from "../utils/report-error";
import {
	getFeaturedArtists,
	getSuggestedCredits,
} from "../utils/suggested-credits";
import type { ReleaseOptions } from "../utils/types";
import { CreditPicker } from "./credit-picker";
import { useImportSession } from "./use-import-session";

function getSession(
	data: ResolveData,
	options: ReleaseOptions,
): Track[] | undefined {
	if (!options.fillFields.credits || !options.fillFields.tracks)
		return undefined;
	const tracks = data.tracks ?? [];
	return tracks.some(
		(track) =>
			!track.header &&
			(Boolean(track.creditsUrl) ||
				(track.credits?.length ?? 0) > 0 ||
				getFeaturedArtists(track.title ?? "", track.artists).length > 0),
	)
		? tracks
		: undefined;
}

export function SuggestedCreditPicker() {
	const { count, session } = useImportSession(getSession);
	return session === undefined ? null : (
		<SuggestedPanel key={count} tracks={session} />
	);
}

function SuggestedPanel({ tracks }: Readonly<{ tracks: Track[] }>) {
	const readReissue = () => {
		const parent = document.querySelector<HTMLInputElement | HTMLSelectElement>(
			"#parent_id",
		);
		return parent !== null && parent.value !== "" && parent.value !== "0";
	};
	const [isReissue, setIsReissue] = useState(readReissue);
	const [loadedTracks, setLoadedTracks] = useState(tracks);
	const [progress, setProgress] = useState({ completed: 0, total: 0 });
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>();
	useEffect(() => {
		const changed = () => setIsReissue(readReissue());
		document.addEventListener("change", changed);
		return () => document.removeEventListener("change", changed);
	}, []);
	useEffect(() => {
		let active = true;
		const cancel = () => {
			active = false;
		};
		document.addEventListener("importEvent", cancel);
		void loadCreditSuggestions(tracks, {
			isActive: () => active,
			onProgress: (completed, total) => setProgress({ completed, total }),
		})
			.then((result) => {
				if (!active) return;
				setLoadedTracks(result.tracks);
				setLoading(false);
				if (result.failedPositions.length > 0) {
					setError(
						`Could not load song credits for tracks ${result.failedPositions.join(", ")}. Suggestions may be incomplete.`,
					);
				}
			})
			.catch((cause: unknown) => {
				reportSubmissionError(cause);
				if (active) {
					setLoading(false);
					setError(
						"Could not load song credits. Suggestions may be incomplete.",
					);
				}
			});
		return () => {
			cancel();
			document.removeEventListener("importEvent", cancel);
		};
	}, [tracks]);
	const suggestions = getSuggestedCredits(loadedTracks).filter(
		(credit) =>
			!isReissue || ["featured", "guest", "remixer"].includes(credit.role),
	);
	return (
		<CreditPicker
			id="ebr-suggested-credit-picker"
			title="Suggested credits"
			hint="Review artist identities and roles before adding. Blank Tracks means the whole release. Combine ordinary roles covering the same tracks before submitting."
			credits={suggestions}
			showDetails
			loading={loading}
			notice={
				<div>
					{isReissue && (
						<div>
							On reissues, RYM permits only featured, guest and remixer credits.
							Other suggestions are omitted.
						</div>
					)}
					{loading && (
						<div role="status">
							Loading song credits ({progress.completed}/{progress.total})...
						</div>
					)}
					{error && (
						<div role="alert" style={{ color: "var(--gen-text-red, #a33)" }}>
							{error}
						</div>
					)}
					{!loading && suggestions.length === 0 && (
						<div>No credit suggestions found.</div>
					)}
				</div>
			}
		/>
	);
}
