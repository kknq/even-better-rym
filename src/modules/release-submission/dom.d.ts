import type { ResolveData } from "~/shared/services/types";

type CustomEventMap = {
	importEvent: CustomEvent<ResolveData>;
	fillEvent: CustomEvent<FillData>;
	EbrArtistShortcutInsertedEvent: CustomEvent<ArtistShortcutInsertedDetail>;
};

export type FillData = {
	filledField: "date";
};

export type ArtistShortcutInsertedDetail = {
	type: string;
	assocId: string;
	text?: string;
	targetId: string;
	previousValue?: string;
};

declare global {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Document {
		//adds definition to Document, but you can do the same with HTMLElement
		addEventListener<K extends keyof CustomEventMap>(
			type: K,
			listener: (this: Document, ev: CustomEventMap[K]) => void,
		): void;
		removeEventListener<K extends keyof CustomEventMap>(
			type: K,
			listener: (this: Document, ev: CustomEventMap[K]) => void,
		): void;
	}
}
