const BYTE_CHUNK_SIZE = 0x8000;

/**
 * Encodes binary image data into a base64 string without relying on large spread calls.
 */
export function encodeArrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';

	for (let offset = 0; offset < bytes.length; offset += BYTE_CHUNK_SIZE) {
		const chunk = bytes.subarray(offset, offset + BYTE_CHUNK_SIZE);
		for (const byte of chunk) {
			binary += String.fromCharCode(byte);
		}
	}

	return btoa(binary);
}

/**
 * Decodes a base64 string back into raw binary image data.
 */
export function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes.buffer;
}