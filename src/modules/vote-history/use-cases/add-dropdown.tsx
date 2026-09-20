import { render } from "preact";

import { waitForElement } from "~/shared/utils/dom";

import { getVoteHistoryUrl } from "./history-urls";

const histories = [
	{ label: "Music", path: "/rgenre/vote_history" },
	{ label: "Film", path: "/rgenre/film_vote_history" },
	{ label: "Descriptors", path: "/rdescriptor/vote_history" },
] as const;

const filmVoteHistoryPath = "/rgenre/film_vote_history";

export default async function addDropdown(
	label: string,
	queryParameter: string,
	items: DropdownItem[],
): Promise<void> {
	const table = await waitForElement(".mbgen");
	const container = document.createElement("div");
	table.before(container);

	render(
		<Dropdown label={label} queryParameter={queryParameter} items={items} />,
		container,
	);
}

function Dropdown({ label, queryParameter, items }: Readonly<DropdownProps>) {
	const parameters = new URLSearchParams(globalThis.location.search);
	const currentPath = globalThis.location.pathname;

	const handleChange = (event: Event) => {
		const value = (event.target as HTMLSelectElement).value;
		if (value === "") {
			parameters.delete(queryParameter);
		} else {
			parameters.set(queryParameter, value);
		}
		parameters.set("start", "0");
		globalThis.location.search = `?${parameters.toString()}`;
	};

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				marginTop: "12px",
				marginBottom: "12px",
			}}
		>
			{currentPath !== filmVoteHistoryPath && (
				<>
					<label htmlFor={`brym-vote-history-${label}`}>{label}</label>
					<select
						id={`brym-vote-history-${label}`}
						style={{ marginLeft: "4px" }}
						onChange={handleChange}
						value={parameters.get(queryParameter) ?? ""}
					>
						<option value="">all</option>
						{items.map((item) => (
							<option key={item.id} value={item.id}>
								{item.name}
							</option>
						))}
					</select>
				</>
			)}
			<div style={{ display: "flex", marginLeft: "8px" }}>
				{histories.map((history) => (
					<button
						key={history.path}
						type="button"
						className="btn darkgray_btn btn_small"
						disabled={history.path === currentPath}
						aria-pressed={history.path === currentPath}
						onClick={() => {
							globalThis.location.href = getVoteHistoryUrl(
								history.path,
								globalThis.location.search,
							);
						}}
						style={{
							background:
								history.path === currentPath
									? "var(--mono-4)"
									: "var(--mono-7)",
							color: "var(--text-primary)",
							borderColor: "var(--ui-detail-neutral)",
							opacity: "1",
						}}
					>
						{history.label}
					</button>
				))}
			</div>
		</div>
	);
}

type DropdownProps = {
	label: string;
	queryParameter: string;
	items: DropdownItem[];
};

type DropdownItem = {
	id: string;
	name: string;
};
