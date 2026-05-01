import type { TFile } from 'obsidian';
import { decodeBase64ToArrayBuffer, encodeArrayBufferToBase64 } from './arrayBufferBase64';
import { inferMimeTypeFromFilename, normalizeImageFilename, normalizeImageMimeType } from './imageMime';

type Base64FileInit = {
	buffer: ArrayBuffer;
	filename?: string;
	mimeType?: string;
};

/**
 * Parses an inline Markdown image that embeds an image data URL.
 */
function parseMarkdownImageDataUrl(link: string): { filename: string; mimeType: string; base64: string } | null {
	const match = link.match(/^!\[(.*?)\]\(data:(image\/[^;]+);base64,([^\)]+)\)$/);
	if (!match) {
		return null;
	}

	return {
		filename: match[1],
		mimeType: normalizeImageMimeType(match[2], match[1]),
		base64: match[3],
	};
}

/**
 * Represents one inline image payload together with its filename and MIME metadata.
 */
export class Base64File {
	buffer: ArrayBuffer;
	filename: string;
	mimeType: string;

	/**
	 * Creates an image wrapper from either legacy positional arguments or a structured initializer.
	 */
	constructor(buffer: ArrayBuffer, filename?: string, mimeType?: string);
	constructor(init: Base64FileInit);
	constructor(bufferOrInit: ArrayBuffer | Base64FileInit, filename?: string, mimeType?: string) {
		const init = bufferOrInit instanceof ArrayBuffer
			? { buffer: bufferOrInit, filename, mimeType }
			: bufferOrInit;

		const resolvedMimeType = normalizeImageMimeType(init.mimeType, init.filename);
		this.buffer = init.buffer;
		this.mimeType = resolvedMimeType;
		this.filename = normalizeImageFilename(init.filename, resolvedMimeType);
	}

	/**
	 * Reports the raw binary size of the wrapped image payload.
	 */
	get size(): number {
		return this.buffer.byteLength;
	}

	/**
	 * Encodes the wrapped binary image into base64 text.
	 */
	toBase64String(): string {
		return encodeArrayBufferToBase64(this.buffer);
	}

	/**
	 * Builds an inline Markdown image using the file's current MIME type and filename.
	 */
	toMarkdownImage(): string {
		return `![${this.filename}](data:${this.mimeType};base64,${this.toBase64String()})`;
	}

	/**
	 * Preserves compatibility with the existing plugin API for base64 string generation.
	 */
	to64String(): string {
		return this.toBase64String();
	}

	/**
	 * Preserves compatibility with the existing plugin API for inline Markdown generation.
	 */
	to64Link(): string {
		return this.toMarkdownImage();
	}

	/**
	 * Rehydrates a Base64File from an inline Markdown image data URL.
	 */
	static from64Link(link: string): Base64File | null {
		const parsed = parseMarkdownImageDataUrl(link);
		if (!parsed) {
			return null;
		}

		return new Base64File({
			buffer: decodeBase64ToArrayBuffer(parsed.base64),
			filename: parsed.filename,
			mimeType: parsed.mimeType,
		});
	}

	/**
	 * Rehydrates a Base64File from raw base64 data and optional image metadata.
	 */
	static from64String(base64: string, filename?: string, mimeType?: string): Base64File {
		return new Base64File({
			buffer: decodeBase64ToArrayBuffer(base64),
			filename,
			mimeType,
		});
	}

	/**
	 * Builds a Base64File from a browser File while preserving browser-provided MIME metadata.
	 */
	static async fromFile(file: File): Promise<Base64File> {
		const arrayBuffer = await file.arrayBuffer();
		return new Base64File({
			buffer: arrayBuffer,
			filename: file.name,
			mimeType: file.type || inferMimeTypeFromFilename(file.name),
		});
	}

	/**
	 * Builds a Base64File from an Obsidian vault file while inferring MIME metadata from its name.
	 */
	static async fromTFile(tfile: TFile): Promise<Base64File> {
		const arrayBuffer = await tfile.vault.readBinary(tfile);
		return new Base64File({
			buffer: arrayBuffer,
			filename: tfile.name,
			mimeType: inferMimeTypeFromFilename(tfile.name),
		});
	}
}