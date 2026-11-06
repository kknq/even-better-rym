import * as storage from "~/shared/utils/storage";

const STORAGE_KEY = "brym.userPageSettings";

export type UserPageSettings = {
	followStatus: boolean;
	editBoxes: boolean;
};

export const defaultUserPageSettings = (): UserPageSettings => ({
	followStatus: true,
	editBoxes: true,
});

export const mergeUserPageSettings = (
	overrides: Partial<UserPageSettings> = {},
): UserPageSettings => ({
	...defaultUserPageSettings(),
	...overrides,
});

export const getUserPageSettings = async (): Promise<UserPageSettings> =>
	mergeUserPageSettings(
		await storage.get<Partial<UserPageSettings>>(STORAGE_KEY),
	);

export const setUserPageSettings = (
	settings: UserPageSettings,
): Promise<void> => storage.set(STORAGE_KEY, settings);
