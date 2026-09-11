import { createPortal } from "preact/compat";
import { useState } from "preact/hooks";

type Props = {
	initialImage: string;
	loadImages: () => Promise<string[]>;
	controlsTarget: HTMLElement;
};

export function DiscogsCarousel({
	initialImage,
	loadImages,
	controlsTarget,
}: Props) {
	const [images, setImages] = useState<string[]>([initialImage]);
	const [index, setIndex] = useState(0);
	const [loaded, setLoaded] = useState(false);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");

	const navigate = (direction: -1 | 1) => {
		if (loading) return;
		if (!loaded) {
			setLoading(true);
			setMessage("Looking for Discogs images…");
			void loadImages()
				.then((nextImages) => {
					setImages([initialImage, ...nextImages]);
					setLoaded(true);
					setIndex(direction < 0 ? nextImages.length : 1);
					setMessage(
						nextImages.length === 0 ? "No secondary Discogs images found." : "",
					);
				})
				.catch((error: unknown) => {
					setMessage(
						error instanceof Error
							? error.message
							: "Could not load Discogs images.",
					);
				})
				.finally(() => setLoading(false));
			return;
		}
		setIndex(
			(current) => (current + direction + images.length) % images.length,
		);
	};

	return (
		<>
			<section
				className="ebr-discogs-carousel"
				aria-label="Discogs release images"
			>
				<div className="ebr-discogs-carousel-viewport">
					<img
						src={images[index]}
						alt={`Discogs image ${index + 1} of ${images.length}`}
					/>
				</div>
			</section>
			{createPortal(
				<>
					<div className="ebr-discogs-carousel-controls">
						<button
							type="button"
							onClick={() => navigate(-1)}
							disabled={loading}
							aria-label="Previous Discogs image"
						>
							Previous
						</button>
						<span>
							{index + 1} / {images.length}
						</span>
						<button
							type="button"
							onClick={() => navigate(1)}
							disabled={loading}
							aria-label="Next Discogs image"
						>
							Next
						</button>
					</div>
					{message && (
						<div className="ebr-discogs-carousel-status">{message}</div>
					)}
				</>,
				controlsTarget,
			)}
		</>
	);
}
