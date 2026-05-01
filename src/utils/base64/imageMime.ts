const DEFAULT_IMAGE_MIME_TYPE = 'image/png';

const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	bmp: 'image/bmp',
	svg: 'image/svg+xml',
	avif: 'image/avif',
};

const MIME_TYPE_TO_EXTENSION: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpeg',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/bmp': 'bmp',
	'image/svg+xml': 'svg',
	'image/avif': 'avif',
};

/**
 * Infers an image MIME type from a filename extension when explicit metadata is absent.
 */
export function inferMimeTypeFromFilename(filename?: string): string {
	if (!filename) {
		return DEFAULT_IMAGE_MIME_TYPE;
	}

	const extension = filename.split('.').pop()?.toLowerCase();
	if (!extension) {
		return DEFAULT_IMAGE_MIME_TYPE;
	}

	return EXTENSION_TO_MIME_TYPE[extension] ?? DEFAULT_IMAGE_MIME_TYPE;
}

/**
 * Normalizes a possibly missing or shorthand image MIME type into a supported value.
 */
export function normalizeImageMimeType(mimeType?: string, filename?: string): string {
	if (!mimeType) {
		return inferMimeTypeFromFilename(filename);
	}

	if (mimeType === 'image/jpg') {
		return 'image/jpeg';
	}

	return mimeType;
}

/**
 * Ensures an image filename exists and has an extension consistent with the MIME type.
 */
export function normalizeImageFilename(filename: string | undefined, mimeType: string): string {
	const safeFilename = filename?.trim() || 'image';
	if (safeFilename.includes('.')) {
		return safeFilename;
	}

	const extension = MIME_TYPE_TO_EXTENSION[mimeType] ?? 'png';
	return `${safeFilename}.${extension}`;
}

/**
 * Replaces the current filename extension with one appropriate for the target MIME type.
 */
export function replaceFilenameExtension(filename: string, mimeType: string): string {
	const baseName = filename.includes('.') ? filename.slice(0, filename.lastIndexOf('.')) : filename;
	return normalizeImageFilename(baseName, mimeType);
}