import { type ComponentChildren, createContext } from "preact";
import { useContext, useEffect } from "preact/hooks";
import {
	normalizeArtistName,
	parseArtistToken,
	type ReleaseArtistLabels,
} from "../utils/release-artist-links";
import { useLatestState } from "./use-latest-state";

type ArtistAssociation = {
	artistId: string;
	creditedName?: string;
	canonicalName?: string;
};

const ArtistAssociations = createContext<
	ReadonlyMap<string, ArtistAssociation> | undefined
>(undefined);

export function getCreditedArtistName(
	name: string,
	association: ArtistAssociation | undefined,
): string | undefined {
	return association?.creditedName !== undefined ||
		(association?.canonicalName !== undefined &&
			normalizeArtistName(name) !==
				normalizeArtistName(association.canonicalName))
		? name
		: undefined;
}

export function rememberArtistAssociation(
	name: string,
	artistId: string,
	canonicalName?: string,
): void {
	document.dispatchEvent(
		new CustomEvent("artistAssociationEvent", {
			detail: { name, artistId, canonicalName },
		}),
	);
}

export function useArtistAssociations(): ReadonlyMap<
	string,
	ArtistAssociation
> {
	const associations = useContext(ArtistAssociations);
	if (associations === undefined)
		throw new Error("Missing artist associations provider");
	return associations;
}

export function ArtistAssociationsProvider({
	children,
}: Readonly<{ children: ComponentChildren }>) {
	const { state, latest, commit } = useLatestState(
		() => new Map<string, ArtistAssociation>(),
	);
	useEffect(() => {
		const reset = () => commit(new Map());
		const remember = (
			event: CustomEvent<{
				name: string;
				artistId: string;
				canonicalName?: string;
			}>,
		) => {
			const key = normalizeArtistName(event.detail.name);
			const previous = latest.current.get(key);
			commit(
				new Map(latest.current).set(
					key,
					previous?.artistId === event.detail.artistId
						? {
								...previous,
								creditedName:
									event.detail.canonicalName === undefined
										? previous.creditedName
										: undefined,
								canonicalName:
									event.detail.canonicalName ?? previous.canonicalName,
							}
						: {
								artistId: event.detail.artistId,
								...(event.detail.canonicalName === undefined
									? {}
									: { canonicalName: event.detail.canonicalName }),
							},
				),
			);
		};
		const releaseChanged = (event: CustomEvent<ReleaseArtistLabels>) => {
			const next = new Map(latest.current);
			for (const [name, token] of event.detail.labels) {
				const artist = parseArtistToken(token);
				if (artist !== undefined) {
					const key = normalizeArtistName(name);
					const previous = next.get(key);
					next.set(key, {
						artistId: artist.id,
						creditedName: artist.name,
						canonicalName:
							event.detail.artistNames?.get(name) ??
							(previous?.artistId === artist.id
								? previous.canonicalName
								: undefined),
					});
				}
			}
			commit(next);
		};
		document.addEventListener("importEvent", reset);
		document.addEventListener("releaseArtistLabelsEvent", releaseChanged);
		document.addEventListener("artistAssociationEvent", remember);
		return () => {
			document.removeEventListener("importEvent", reset);
			document.removeEventListener("releaseArtistLabelsEvent", releaseChanged);
			document.removeEventListener("artistAssociationEvent", remember);
		};
	}, []);
	return (
		<ArtistAssociations.Provider value={state}>
			{children}
		</ArtistAssociations.Provider>
	);
}
