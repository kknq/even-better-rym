import { useEffect, useState } from "preact/hooks";
import { GUEST_ROLE, getGuestArtists } from "../utils/guest-credits";
import {
	creditKey,
	getFeaturedArtists,
	getSuggestedCredits,
	isSpecialCreditRole,
} from "../utils/suggested-credits";
import { isVariousArtistsRelease } from "../utils/track-artist-links";
import { CreditPicker } from "./credit-picker";
import type { TrackSession } from "./use-import-tracks";
import { useImportTracks } from "./use-import-tracks";

export function CreditPickers() {
	const { count, session } = useImportTracks();
	if (
		!session?.options.fillFields.credits ||
		!session.options.fillFields.tracks
	)
		return null;
	return <CreditPanels key={count} session={session} />;
}

function CreditPanels({ session }: Readonly<{ session: TrackSession }>) {
	const { tracks: loadedTracks, loading, progress, error } = session;
	const releaseArtists = session.data.artists ?? [];
	const showSuggestions = (session.data.tracks ?? []).some(
		(track) =>
			!track.header &&
			(Boolean(track.creditsUrl) ||
				(track.credits?.length ?? 0) > 0 ||
				getFeaturedArtists(track.title ?? "", track.artists).length > 0),
	);
	const readReissue = () => {
		const parent = document.querySelector<HTMLInputElement | HTMLSelectElement>(
			"#parent_id",
		);
		return parent !== null && parent.value !== "" && parent.value !== "0";
	};
	const [isReissue, setIsReissue] = useState(readReissue);
	useEffect(() => {
		const changed = () => setIsReissue(readReissue());
		document.addEventListener("change", changed);
		return () => document.removeEventListener("change", changed);
	}, []);
	const guests = isVariousArtistsRelease(releaseArtists)
		? []
		: getGuestArtists(loadedTracks, releaseArtists);
	const suggestions = getSuggestedCredits(loadedTracks).filter(
		(credit) => !isReissue || isSpecialCreditRole(credit.role),
	);
	return (
		<>
			{guests.length > 0 && (
				<CreditPicker
					key="guest"
					id="ebr-guest-credit-picker"
					title="Guest credits"
					hint={`Credit artists who appear on only some tracks as "${GUEST_ROLE}" on those tracks. Already-featured appearances are excluded.`}
					credits={guests.map((guest) => ({
						...guest,
						key: creditKey(guest.name, GUEST_ROLE),
						role: GUEST_ROLE,
					}))}
					loading={loading}
				/>
			)}
			{showSuggestions && (
				<CreditPicker
					key="suggested"
					id="ebr-suggested-credit-picker"
					title="Suggested credits"
					hint="Review artist identities and roles before adding. Blank Tracks means the whole release. Ordinary roles for the same artist covering identical tracks are combined."
					credits={suggestions}
					showDetails
					loading={loading}
					notice={
						<div>
							{isReissue && (
								<div>
									On reissues, RYM permits only featured, guest and remixer
									credits. Other suggestions are omitted.
								</div>
							)}
							{loading && (
								<div role="status">
									Loading song credits ({progress.completed}/{progress.total}
									)...
								</div>
							)}
							{error && (
								<div
									role="alert"
									style={{ color: "var(--gen-text-red, #a33)" }}
								>
									{error}
								</div>
							)}
							{!loading && suggestions.length === 0 && (
								<div>No credit suggestions found.</div>
							)}
						</div>
					}
				/>
			)}
		</>
	);
}
