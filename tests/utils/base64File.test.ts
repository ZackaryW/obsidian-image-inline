import test from 'node:test';
import assert from 'node:assert/strict';
import { Base64File } from '../../src/utils/base64/base64File';
import {
	decodeBase64ToArrayBuffer,
	encodeArrayBufferToBase64,
} from '../../src/utils/base64/arrayBufferBase64';

/**
 * Verifies that base64 encoding and decoding round-trips arbitrary binary data.
 */
test('encodeArrayBufferToBase64 round-trips binary content', () => {
	const original = Uint8Array.from([0, 255, 16, 32, 64, 128]).buffer;
	const encoded = encodeArrayBufferToBase64(original);
	const decoded = decodeBase64ToArrayBuffer(encoded);

	assert.deepEqual(Array.from(new Uint8Array(decoded)), [0, 255, 16, 32, 64, 128]);
});

/**
 * Verifies that markdown data URLs preserve the original MIME type.
 */
test('Base64File emits markdown links with the source MIME type', () => {
	const file = new Base64File({
		buffer: Uint8Array.from([1, 2, 3]).buffer,
		filename: 'photo.jpeg',
		mimeType: 'image/jpeg',
	});

	assert.match(file.to64Link(), /^!\[photo\.jpeg\]\(data:image\/jpeg;base64,/);
});

/**
 * Verifies that parsing an inline markdown image restores filename and MIME type.
 */
test('Base64File parses markdown data URLs across image MIME types', () => {
	const file = Base64File.from64Link('![diagram.webp](data:image/webp;base64,AQID)');

	assert.ok(file);
	assert.equal(file?.filename, 'diagram.webp');
	assert.equal(file?.mimeType, 'image/webp');
	assert.deepEqual(Array.from(new Uint8Array(file?.buffer ?? new ArrayBuffer(0))), [1, 2, 3]);
});