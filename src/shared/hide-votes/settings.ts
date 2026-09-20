const STORAGE_KEY = "brym.voteVisibilitySettings";

export type VoteVisibilitySettings = {
	genres: boolean;
	descriptors: boolean;
	hideStats: boolean;
};

type VoteVisibilitySettingsOverrides = Partial<VoteVisibilitySettings>;

export const defaultVoteVisibilitySettings = (): VoteVisibilitySettings => ({
	genres: true,
	descriptors: true,
	hideStats: false,
});

export const mergeVoteVisibilitySettings = (
	overrides: VoteVisibilitySettingsOverrides = {},
): VoteVisibilitySettings => ({
	...defaultVoteVisibilitySettings(),
	...overrides,
});

export const getVoteVisibilitySettings =
	async (): Promise<VoteVisibilitySettings> => {
		const storage = await import("~/shared/utils/storage");
		return mergeVoteVisibilitySettings(
			await storage.get<VoteVisibilitySettingsOverrides>(STORAGE_KEY),
		);
	};

export const setVoteVisibilitySettings = async (
	settings: VoteVisibilitySettings,
): Promise<void> => {
	const storage = await import("~/shared/utils/storage");
	await storage.set(STORAGE_KEY, settings);
};
