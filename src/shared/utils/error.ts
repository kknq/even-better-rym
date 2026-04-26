export const parseError = (error: unknown): Error => {
	if (error instanceof Error) return error;
	const message = typeof error === "string" ? error : String(error);
	return new Error(message);
};
