import { useEffect, useState } from "preact/hooks";
import { GUEST_ROLE, getGuestArtists } from "../utils/guest-credits";
import {
	creditKey,
	getFeaturedArtists,
	getSuggestedCredits,
	getUnverifiedCreditSuggestions,
	isSpecialCreditRole,
	sortCreditsByFirstAppearance,
} from "../utils/suggested-credits";
import { isVariousArtistsRelease } from "../utils/track-artist-links";
import { CreditPicker } from "./credit-picker";
import type { TrackSession } from "./use-import-tracks";
import { useImportTracks } from "./use-import-tracks";

export function CreditPickers() {
	const { count, session } = useImportTracks();
	if (!session?.options.fillFields.credits) return null;
	return <CreditPanels key={count} session={session} />;
}

function CreditPanels({ session }: Readonly<{ session: TrackSession }>) {
	const { tracks: loadedTracks, loading, progress, error } = session;
	const releaseArtists = session.data.artists ?? [];
	const releaseCredits = session.data.releaseCredits ?? [];
	const trackNotice = !session.options.fillFields.tracks && (
		<div
			className="ebr-credit-track-warning"
			style={{
				width: "fit-content",
				maxWidth: "100%",
				boxSizing: "border-box",
				margin: "0 0 6px",
				padding: "3px 8px",
				color: "#8a1c1c",
				background: "#fff0f0",
				border: "1px solid #e5a0a0",
				borderRadius: "3px",
				fontSize: "0.9em",
				overflowWrap: "anywhere",
			}}
		>
			Track positions come from the imported release. Check that they match the
			existing tracklist before adding credits.
		</div>
	);
	const showSuggestions =
		(session.data.tracks ?? []).some(
			(track) =>
				!track.header &&
				(Boolean(track.creditsUrl) ||
					(track.credits?.length ?? 0) > 0 ||
					getFeaturedArtists(track.title ?? "", track.artists).length > 0),
		) ||
		Boolean(releaseCredits.length || session.data.unverifiedCredits?.length);
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
	const suggestions = [
		...sortCreditsByFirstAppearance(
			getSuggestedCredits(loadedTracks, releaseCredits).filter(
				(credit) => !isReissue || isSpecialCreditRole(credit.role),
			),
			loadedTracks,
			releaseArtists,
		),
		...getUnverifiedCreditSuggestions(session.data.unverifiedCredits ?? []),
	];
	return (
		<>
			{guests.length > 0 && (
				<CreditPicker
					key="guest"
					id="ebr-guest-credit-picker"
					title="Guest credits"
					hint={`Review these suggested "${GUEST_ROLE}" credits: use them only when the source clearly indicates a guest collaboration. Already-featured appearances are excluded.`}
					credits={guests.map((guest) => ({
						...guest,
						key: creditKey(guest.name, GUEST_ROLE),
						role: GUEST_ROLE,
					}))}
					loading={loading}
					isReissue={isReissue}
					warning={trackNotice}
				/>
			)}
			{showSuggestions && (
				<CreditPicker
					key="suggested"
					id="ebr-suggested-credit-picker"
					title="Suggested credits"
					hint="Edit artist names and roles before adding. Name corrections preserve chosen RYM links and update the credited name. Anonymous and Unknown Artist must be credited in plain text. Blank Tracks means the whole release. Ordinary roles for the same artist covering identical tracks are combined. Resolve ??? fields before crediting unverified suggestions."
					credits={suggestions}
					showDetails
					loading={loading}
					isReissue={isReissue}
					warning={trackNotice}
					notice={
						<div>
							{isReissue && (
								<div>
									On reissues, RYM permits only featured, guest and remixer
									credits. Other verified suggestions are omitted; check
									unverified suggestions before adding them.
								</div>
							)}
							{loading && (
								<output>
									Loading song credits ({progress.completed}/{progress.total}
									)...
								</output>
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
