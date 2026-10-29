import type { ResolveData } from "~/shared/services/types";

import { FIELD_FILLERS } from "./field-fillers";
import type { ReleaseOptions } from "./types";

export async function fill(
	data: ResolveData,
	options: ReleaseOptions,
): Promise<void> {
	const filled = { ...data, artists: data.artists ?? [] };
	const errors: unknown[] = [];

	// A broken field must not prevent the remaining fields from filling.
	for (const field of Object.keys(FIELD_FILLERS) as (keyof ResolveData)[]) {
		try {
			await fillField(field, filled, options);
		} catch (error) {
			errors.push(error);
		}
	}

	if (errors.length === 1) throw errors[0];
	if (errors.length > 1) throw new AggregateError(errors, "Import failed");
}

function fillField<K extends keyof ResolveData>(
	field: K,
	data: ResolveData,
	options: ReleaseOptions,
): void | Promise<void> {
	const filler = FIELD_FILLERS[field];
	const value = data[field];
	if (!filler || value == null) return;
	if (filler.toggle && !options.fillFields[filler.toggle]) return;
	return filler.fill(value, data, options);
}
