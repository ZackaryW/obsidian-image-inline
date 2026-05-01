import { Base64File } from './base64File';
import { normalizeImageFilename, normalizeImageMimeType } from './imageMime';

type FilenameParts = {
	stem: string;
	extension: string;
};

/**
 * Splits a filename into the portion before the last dot and the trailing extension.
 */
function splitFilenameParts(filename: string): FilenameParts {
	const lastDot = filename.lastIndexOf('.');
	if (lastDot <= 0) {
		return {
			stem: filename,
			extension: '',
		};
	}

	return {
		stem: filename.slice(0, lastDot),
		extension: filename.slice(lastDot + 1),
	};
}

/**
 * Builds a timestamped backup filename while preserving the image's original extension.
 */
export function buildOriginalBackupFilename(file: Base64File, timestamp: string): string {
	const mimeType = normalizeImageMimeType(file.mimeType, file.filename);
	const filename = normalizeImageFilename(file.filename, mimeType);
	const { stem, extension } = splitFilenameParts(filename);

	return extension
		? `${stem}_original_${timestamp}.${extension}`
		: `${stem}_original_${timestamp}`;
}

/**
 * Creates a browser File object for saving an inline image back to the vault.
 */
export function createImageFile(file: Base64File, filename = file.filename): File {
	const mimeType = normalizeImageMimeType(file.mimeType, filename);
	const resolvedFilename = normalizeImageFilename(filename, mimeType);
	return new File([file.buffer], resolvedFilename, { type: mimeType });
}