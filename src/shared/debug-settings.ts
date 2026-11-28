import * as storage from "~/shared/utils/storage";

const key = "extensiveLogging";

export const getExtensiveLogging = async (): Promise<boolean> =>
	(await storage.get<boolean>(key)) === true;

export const setExtensiveLogging = (enabled: boolean): Promise<void> =>
	storage.set(key, enabled);

export const isExtensiveLoggingEnabled = async (): Promise<boolean> => {
	try {
		return await getExtensiveLogging();
	} catch (error) {
		console.error("EvenBetterRYM: could not read debug settings", error);
		return false;
	}
};
