import type { VNode } from "preact";
import { useEffect, useState } from "preact/hooks";

import { getMatchingService } from "../services";
import type { Service } from "../services/types";
import type { OneShot } from "../utils/one-shot";
import { fold } from "../utils/one-shot";
import { pipe } from "../utils/pipe";
import { Complete } from "./complete";
import { Failed } from "./failed";
import { Loader } from "./loader";
import { ServiceSelector } from "./service-selector";

export function ServiceLinkForm<E extends Error, T, S extends Service>({
	data,
	services,
	onSubmit,
	submitText = "Submit",
	children,
}: {
	readonly data: OneShot<E, T>;
	readonly services: S[];
	readonly onSubmit: (url: string, service: S) => void | Promise<void>;
	readonly submitText?: string;
	readonly children?: VNode;
}): VNode {
	return (
		<div
			style={{
				display: "flex",
				gap: 8,
				alignItems: "center",
			}}
		>
			<ServiceLinkInput
				services={services}
				submitText={submitText}
				onSubmit={(url, service) => void onSubmit(url, service)}
			>
				{children}
			</ServiceLinkInput>
			{pipe(
				data,
				fold(
					() => null,
					() => <Loader />,
					(error) => <Failed error={error} />,
					() => <Complete />,
				),
			)}
		</div>
	);
}

function ServiceLinkInput<S extends Service>({
	services,
	submitText,
	onSubmit,
	children,
}: {
	readonly services: S[];
	readonly submitText: string;
	readonly onSubmit: (url: string, service: S) => void;
	readonly children?: VNode;
}): VNode {
	const [url, setUrl] = useState("");
	const [selectedService, setSelectedService] = useState<S | undefined>(
		undefined,
	);
	const [showMissingServiceError, setShowMissingServiceError] = useState(false);

	useEffect(() => {
		const service = getMatchingService(services)(url);
		if (service !== undefined) {
			setSelectedService(service);
		}
	}, [services, url]);

	useEffect(() => {
		if (selectedService !== undefined) setShowMissingServiceError(false);
	}, [selectedService]);

	return (
		<form
			style={{
				display: "flex",
				gap: 8,
			}}
			onSubmit={(event) => {
				event.preventDefault();
				if (selectedService === undefined) {
					setShowMissingServiceError(true);
				} else {
					onSubmit(url, selectedService);
				}
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 4,
					alignItems: "center",
					width: 384,
				}}
			>
				<input
					type="url"
					value={url}
					required
					onInput={(event) => setUrl((event.target as HTMLInputElement).value)}
					style={{ width: "100%" }}
				/>
				<ServiceSelector
					services={services}
					selected={selectedService}
					onSelect={setSelectedService}
				/>
				{showMissingServiceError && (
					<div style={{ color: "var(--gen-text-red)" }}>
						Select an import source
					</div>
				)}
				{children}
			</div>
			<input
				type="submit"
				value={submitText}
				style={{
					cursor: "pointer",
				}}
			/>
		</form>
	);
}
