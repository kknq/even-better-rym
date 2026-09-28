import { createPortal } from "preact/compat";
import { useState } from "preact/hooks";

type Props = {
	initialImage: string;
	loadImages: () => Promise<HTMLImageElement[]>;
	controlsTarget: HTMLElement;
};

export function DiscogsCarousel({
	initialImage,
	loadImages,
	controlsTarget,
}: Props) {
	const [secondaryImages, setSecondaryImages] = useState<
		HTMLImageElement[] | undefined
	>();
	const [index, setIndex] = useState(0);
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");

	const requestImages = () => {
		if (loading) return;
		setLoading(true);
		setMessage("");
		void loadImages()
			.then((nextImages) => {
				setSecondaryImages(nextImages);
				if (nextImages.length === 0) {
					setMessage("No secondary Discogs images found.");
					return;
				}
				setIndex(1);
				setIsOpen(true);
			})
			.catch((error: unknown) => {
				setMessage(
					error instanceof Error
						? error.message
						: "Could not load Discogs images.",
				);
			})
			.finally(() => setLoading(false));
	};

	const images = secondaryImages
		? [initialImage, ...secondaryImages.map((image) => image.src)]
		: undefined;
	const canOpen = Boolean(secondaryImages?.length);

	const navigate = (direction: -1 | 1) => {
		if (!images) return;
		setIndex(
			(current) => (current + direction + images.length) % images.length,
		);
	};

	return (
		<>
			{createPortal(
				<>
					<button
						id="even-better-rym-discogs-carousel-button"
						type="button"
						disabled={loading}
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							if (canOpen) {
								setIsOpen(true);
								return;
							}
							requestImages();
						}}
					>
						{loading ? "Looking for Discogs images…" : "View Discogs images"}
					</button>
					{isOpen && images && (
						<div className="ebr-discogs-carousel-controls">
							<button
								type="button"
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									setIsOpen(false);
								}}
								aria-label="Close Discogs images"
							>
								Close
							</button>
							<button
								type="button"
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									navigate(-1);
								}}
								aria-label="Previous Discogs image"
							>
								Previous
							</button>
							<span>
								{index + 1} / {images.length}
							</span>
							<button
								type="button"
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									navigate(1);
								}}
								aria-label="Next Discogs image"
							>
								Next
							</button>
						</div>
					)}
					{message && (
						<div className="ebr-discogs-carousel-status" role="status">
							{message}
						</div>
					)}
				</>,
				controlsTarget,
			)}
			{isOpen && images && (
				<section
					className="ebr-discogs-carousel"
					aria-label="Discogs release images"
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
					}}
					onKeyDown={(event) => event.stopPropagation()}
				>
					<div className="ebr-discogs-carousel-viewport">
						<img
							src={images[index]}
							alt={`Discogs release ${index + 1} of ${images.length}`}
						/>
					</div>
				</section>
			)}
		</>
	);
}
