function filenameReservedRegex() {
	return /[<>:"/\\|?*\u0000-\u001F]/g;
}

function windowsReservedNameRegex() {
	return /^(con|prn|aux|nul|com\d|lpt\d)$/i;
}

// Doesn't make sense to have longer filenames
const MAX_FILENAME_LENGTH = 100;

const reRelativePath = /^\.+[/\\]|^\.+$/;
const reTrailingPeriods = /\.+$/;

export default function filenamify(
	string: string,
	options: { replacement?: string; maxLength?: number } = {},
) {
	const reControlChars = /[\u0000-\u001F\u0080-\u009F]/g;
	const reRepeatedReservedCharacters = /([<>:"/\\|?*\u0000-\u001F]){2,}/g;

	const replacement = options.replacement ?? "!";

	if (
		filenameReservedRegex().test(replacement) &&
		reControlChars.test(replacement)
	) {
		throw new Error(
			"Replacement string cannot contain reserved filename characters",
		);
	}

	if (replacement.length > 0) {
		string = string.replaceAll(reRepeatedReservedCharacters, "$1");
	}

	string = string.normalize("NFD");
	string = string.replace(reRelativePath, replacement);
	string = string.replace(filenameReservedRegex(), replacement);
	string = string.replaceAll(reControlChars, replacement);
	string = string.replace(reTrailingPeriods, "");

	if (replacement.length > 0) {
		const startedWithDot = string.startsWith(".");

		// We removed the whole filename
		if (!startedWithDot && string.startsWith(".")) {
			string = replacement + string;
		}

		// We removed the whole extension
		if (string.endsWith(".")) {
			string += replacement;
		}
	}

	string = windowsReservedNameRegex().test(string)
		? string + replacement
		: string;
	const allowedLength = options.maxLength ?? MAX_FILENAME_LENGTH;
	if (string.length > allowedLength) {
		const extensionIndex = string.lastIndexOf(".");
		if (extensionIndex === -1) {
			string = string.slice(0, allowedLength);
		} else {
			const filename = string.slice(0, extensionIndex);
			const extension = string.slice(extensionIndex);
			string =
				filename.slice(0, Math.max(1, allowedLength - extension.length)) +
				extension;
		}
	}

	return string;
}
