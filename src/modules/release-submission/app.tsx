import injectArtistLinkFormatting from "./use-cases/artist-link-formatting";
import injectArtistLinkPicker from "./use-cases/artist-link-picker";
import injectCatalogNumberControls from "./use-cases/catalog-number-controls";
import injectCreditsControls from "./use-cases/credits-controls";
import injectDateControls from "./use-cases/date-controls";
import injectFileUnderControls from "./use-cases/file-under-controls";
import injectImportControls from "./use-cases/import-controls";
import injectLabelControls from "./use-cases/label-controls";
import injectReleaseArtistPicker from "./use-cases/release-artist-picker";
import injectTracklistControls from "./use-cases/tracklist-controls";

export const main = () => {
	injectArtistLinkFormatting();
	return Promise.all([
		injectImportControls(),
		injectTracklistControls(),
		injectArtistLinkPicker(),
		injectReleaseArtistPicker(),
		injectFileUnderControls(),
		injectCreditsControls(),
		injectLabelControls(),
		injectCatalogNumberControls(),
		injectDateControls(),
	]);
};
