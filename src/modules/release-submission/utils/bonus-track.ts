const BONUS_TRACK_TAG = "[bonus track]";
// "Bonus Track" at the end of a title: bare, after " - ", or in () or [].
const TRAILING_BONUS_TRACK_PATTERN =
	/\s*(?:-\s*bonus track|\(\s*bonus track\s*\)|\[\s*bonus track\s*]|\bbonus track)\s*$/i;

// Returns the title with a trailing bonus-track tag rewritten as
// "[bonus track]".
export const markBonusTrack = (title: string): string => {
	if (!TRAILING_BONUS_TRACK_PATTERN.test(title)) {
		return title;
	}
	const base = title.replace(TRAILING_BONUS_TRACK_PATTERN, "");
	return base.length === 0 ? BONUS_TRACK_TAG : `${base} ${BONUS_TRACK_TAG}`;
};
