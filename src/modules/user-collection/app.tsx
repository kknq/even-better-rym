import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

import { CollectionSettingsControls } from "~/shared/collection/controls";
import { collectionSearchTypes } from "~/shared/collection/options";
import { PageSizeControl } from "~/shared/collection/page-size-control";
import type {
	CollectionKind,
	CollectionSettings,
} from "~/shared/collection/settings";
import { useCollectionSettings } from "~/shared/collection/use-settings";
import { waitForDocumentReady } from "~/shared/utils/dom";

import { FilterButtons } from "./filter-buttons";
import { alignPagination } from "./pagination";
import { collectionUrl, parseCollectionUrl, savedCollectionUrl } from "./url";

export async function injectCollectionFilterButtons() {
	await waitForDocumentReady();
	const kind = location.pathname.startsWith("/film_collection/")
		? "film"
		: "music";
	const table = (
		document.querySelector(".or_q_header") ??
		document.querySelector('#content table img[id^="img_"]')
	)?.closest("table");
	const breadcrumb = document.querySelector(".ui_breadcrumb_frame");
	const pagination = [
		...document.querySelectorAll<HTMLElement>(".navspan"),
	].filter(
		(element) =>
			element.querySelector(
				"a[href*='/collection/'], a[href*='/film_collection/']",
			) ?? element.querySelector(".navlinkcurrent"),
	);
	const app = document.createElement("div");
	app.id = "ebr-collection";
	const anchor = pagination[0]?.parentElement ?? table;
	if (anchor) anchor.before(app);
	else if (breadcrumb) (breadcrumb.closest("table") ?? breadcrumb).after(app);
	else throw new Error("Collection content not found");
	render(<CollectionApp kind={kind} />, app);

	for (const navigation of pagination) {
		const container = document.createElement("div");
		container.className = "ebr-collection-page-size-host";
		const row = navigation.parentElement;
		row?.classList.add("ebr-collection-pagination");
		navigation.after(container);
		render(<PageSize kind={kind} />, container);
		if (row) alignPagination(row, navigation, container);
	}
	if (!pagination.length) {
		for (const position of ["before", "after"] as const) {
			const container = document.createElement("div");
			container.className = "ebr-collection-pagination";
			if (table) table[position](container);
			else if (position === "before") app.after(container);
			else app.parentElement?.append(container);
			render(<PageSize kind={kind} />, container);
		}
	}
}

function CollectionApp({ kind }: Readonly<{ kind: CollectionKind }>) {
	const { settings, save, error } = useCollectionSettings(kind);
	const [open, setOpen] = useState(false);
	const [section, setSection] = useState<"filters" | "columns" | null>(null);
	const [draft, setDraft] = useState<CollectionSettings | null>(null);
	const [savingColumns, setSavingColumns] = useState(false);
	const menu = useRef<HTMLDivElement>(null);
	const menuButton = useRef<HTMLButtonElement>(null);
	const current = parseCollectionUrl(location.href);
	const isTag = current.modifiers.includes("stag");

	useEffect(() => {
		if (!open) return;
		const close = (event: PointerEvent) => {
			if (event.target instanceof Node && !menu.current?.contains(event.target))
				setOpen(false);
		};
		const onEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
				menuButton.current?.focus();
			}
		};
		// Inspect the target before a menu action replaces it during rendering.
		document.addEventListener("pointerdown", close);
		document.addEventListener("keydown", onEscape);
		return () => {
			document.removeEventListener("pointerdown", close);
			document.removeEventListener("keydown", onEscape);
		};
	}, [open]);

	if (!settings)
		return <div role="status">{error || "Loading collection settings..."}</div>;
	const pendingUrl = savedCollectionUrl(location.href, settings);

	return (
		<div class="ebr-collection-layout">
			<div class="ebr-collection-menu" ref={menu}>
				<button
					type="button"
					class="btn btn_small"
					aria-label="Collection settings"
					title="Collection settings"
					aria-expanded={open}
					ref={menuButton}
					onClick={() => {
						setOpen(!open);
						setSection(null);
					}}
				>
					...
				</button>
				{open && (
					<div class="ebr-collection-menu-panel">
						{section === null ? (
							<div style={{ display: "grid", gap: "6px" }}>
								<button
									type="button"
									class="btn"
									onClick={() => setSection("filters")}
								>
									Manage filters
								</button>
								{kind === "music" && (
									<button
										type="button"
										class="btn"
										onClick={() => {
											setDraft({
												...settings,
												columns:
													settings.columns ??
													(current.columns.length ? current.columns : null),
											});
											setSection("columns");
										}}
									>
										Manage columns
									</button>
								)}
							</div>
						) : (
							<>
								<div class="ebr-collection-menu-heading">
									<h3>
										{section === "filters"
											? "Displayed filters"
											: "Displayed columns"}
									</h3>
									<button
										type="button"
										class="btn btn_small"
										onClick={() => setSection(null)}
									>
										Back
									</button>
								</div>
								<CollectionSettingsControls
									kind={kind}
									section={section}
									settings={
										section === "columns" ? (draft ?? settings) : settings
									}
									onChange={(next) => {
										if (section === "columns") setDraft(next);
										else void save(next).catch(console.error);
									}}
								/>
								{kind === "music" && section === "columns" && (
									<>
										{current.view !== "default" && (
											<p>
												Custom columns apply only to the Default view. This view
												keeps its native layout.
											</p>
										)}
										<div class="ebr-collection-menu-actions">
											<button
												type="button"
												class="btn blue_btn"
												disabled={isTag || savingColumns}
												onClick={() => {
													if (!draft) return;
													setSavingColumns(true);
													const next = { ...settings, columns: draft.columns };
													void save(next)
														.then(() =>
															location.assign(
																savedCollectionUrl(location.href, next) ??
																	location.href,
															),
														)
														.catch(console.error)
														.finally(() => setSavingColumns(false));
												}}
											>
												Save columns
											</button>
										</div>
									</>
								)}
								{isTag && (
									<p>
										RYM tag views cannot be combined with filters or custom
										columns. Search for something else to leave the tag view.
									</p>
								)}
							</>
						)}
					</div>
				)}
			</div>
			{error && (
				<p role="alert" class="ebr-collection-notice">
					{error}
				</p>
			)}
			<div class="ebr-collection-content">
				{settings.filters.search && <CollectionSearch kind={kind} />}
				{isTag ? (
					<p>Other filters are unavailable in RYM tag views.</p>
				) : (
					<FilterButtons kind={kind} settings={settings} />
				)}
			</div>
			{pendingUrl && (
				<p class="ebr-collection-notice">
					Saved view changes will apply on your next navigation.{" "}
					<a class="btn btn_small" href={pendingUrl}>
						Apply to this page
					</a>
				</p>
			)}
		</div>
	);
}

function CollectionSearch({ kind }: Readonly<{ kind: CollectionKind }>) {
	const searchTypes = collectionSearchTypes(kind);
	const current = parseCollectionUrl(location.href);
	const token = current.modifiers.find(
		(modifier) => modifier.startsWith("strm_") || modifier === "stag",
	);
	const [type, setType] = useState<string>(() => {
		const selected = token === "stag" ? "g" : token?.slice(5);
		return (
			searchTypes.find(([value]) => value === selected)?.[0] ??
			searchTypes[0][0]
		);
	});
	const [query, setQuery] = useState(
		token
			? decodeURIComponent((current.tail[0] ?? "").replace(/\+/g, " "))
			: "",
	);
	return (
		<form
			class="ebr-collection-search"
			onSubmit={(event) => {
				event.preventDefault();
				location.assign(
					collectionUrl(location.href, { search: { type, query } }),
				);
			}}
		>
			<label>
				Search {current.user}'s collection{" "}
				<input
					type="search"
					name="q"
					value={query}
					onInput={(event) => setQuery(event.currentTarget.value)}
				/>
			</label>
			<label>
				in{" "}
				<select
					name="type"
					value={type}
					onChange={(event) => setType(event.currentTarget.value)}
				>
					{searchTypes.map(([value, label]) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</select>
			</label>
			<button type="submit" class="btn btn_small">
				Search
			</button>
			{token && (
				<button
					type="button"
					class="btn btn_small"
					onClick={() =>
						location.assign(
							collectionUrl(location.href, { search: { type, query: "" } }),
						)
					}
				>
					Clear
				</button>
			)}
		</form>
	);
}

function PageSize({ kind }: Readonly<{ kind: CollectionKind }>) {
	const { settings, save, error } = useCollectionSettings(kind);
	const current = parseCollectionUrl(location.href);
	if (current.modifiers.includes("stag")) return null;
	if (!settings) return <span role="status">{error || "Loading..."}</span>;
	const currentSize = current.modifiers.find((modifier) =>
		/^n\d+$/.test(modifier),
	);
	return (
		<PageSizeControl
			value={
				settings.pageSize ?? (currentSize ? Number(currentSize.slice(1)) : null)
			}
			onChange={async (pageSize) => {
				await save({ ...settings, pageSize });
				location.assign(
					collectionUrl(location.href, {
						family: "pageSize",
						value: pageSize === null ? "" : `n${pageSize}`,
						columns: settings.columns ?? undefined,
					}),
				);
			}}
		/>
	);
}
