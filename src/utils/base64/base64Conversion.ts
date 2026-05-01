import type { TFile } from 'obsidian';
import { Base64File } from './base64File';
import { replaceFilenameExtension } from './imageMime';

/**
 * Converts browser, clipboard, and vault image sources into Base64File objects.
 */
export class Base64Conversion {
	/**
	 * Extracts the first image payload from a clipboard paste event.
	 */
	async fromClipboardEvent(event: ClipboardEvent): Promise<Base64File | null> {
		const items = event.clipboardData?.items;
		if (!items) {
			return null;
		}

		for (const item of Array.from(items)) {
			if (!item.type.startsWith('image/')) {
				continue;
			}

			const file = item.getAsFile();
			if (file) {
				return this.fromFile(file);
			}
		}

		return null;
	}

	/**
	 * Extracts the first image payload from the async clipboard API when available.
	 */
	async fromClipboard(): Promise<Base64File | null> {
		try {
			const items = await navigator.clipboard.read();
			for (const item of items) {
				const imageType = item.types.find((type) => type.startsWith('image/'));
				if (!imageType) {
					continue;
				}

				const blob = await item.getType(imageType);
				const arrayBuffer = await blob.arrayBuffer();
				return new Base64File({
					buffer: arrayBuffer,
					filename: `clipboard.${imageType.split('/')[1] ?? 'png'}`,
					mimeType: imageType,
				});
			}
		} catch {
			return null;
		}

		return null;
	}

	/**
	 * Converts a browser File into the plugin's image wrapper.
	 */
	async fromFile(file: File): Promise<Base64File> {
		return Base64File.fromFile(file);
	}

	/**
	 * Converts an Obsidian vault file into the plugin's image wrapper.
	 */
	async fromTFile(tfile: TFile): Promise<Base64File> {
		return Base64File.fromTFile(tfile);
	}

	/**
	 * Resizes an image and returns a PNG payload suitable for inline embedding.
	 */
	async resize(file: Base64File, percentage: number): Promise<Base64File> {
		return new Promise((resolve, reject) => {
			const blob = new Blob([file.buffer], { type: file.mimeType });
			const imageUrl = URL.createObjectURL(blob);
			const img = new Image();

			img.onload = () => {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					URL.revokeObjectURL(imageUrl);
					reject(new Error('Could not get canvas context'));
					return;
				}

				const newWidth = Math.round(img.width * (percentage / 100));
				const newHeight = Math.round(img.height * (percentage / 100));
				canvas.width = newWidth;
				canvas.height = newHeight;
				ctx.drawImage(img, 0, 0, newWidth, newHeight);

				canvas.toBlob(async (resizedBlob) => {
					if (!resizedBlob) {
						URL.revokeObjectURL(imageUrl);
						reject(new Error('Could not create blob from canvas'));
						return;
					}

					try {
						const arrayBuffer = await resizedBlob.arrayBuffer();
						URL.revokeObjectURL(imageUrl);
						resolve(new Base64File({
							buffer: arrayBuffer,
							filename: replaceFilenameExtension(file.filename, 'image/png'),
							mimeType: 'image/png',
						}));
					} catch (error) {
						URL.revokeObjectURL(imageUrl);
						reject(error);
					}
				}, 'image/png');
			};

			img.onerror = () => {
				URL.revokeObjectURL(imageUrl);
				reject(new Error('Failed to load image'));
			};

			img.src = imageUrl;
		});
	}
}