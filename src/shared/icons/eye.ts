export const eyeIcon = (hidden: boolean): string =>
	hidden
		? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.8 10.8 0 0 1 12 5c5.2 0 8.7 4.3 9.7 7-0.4 1.1-1.2 2.5-2.5 3.7M6.1 6.1C4.2 7.5 3 9.7 2.3 12c1 2.7 4.5 7 9.7 7 1.1 0 2.1-.2 3-.5"/></svg>'
		: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.3 12C3.3 9.3 6.8 5 12 5s8.7 4.3 9.7 7c-1 2.7-4.5 7-9.7 7S3.3 14.7 2.3 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
