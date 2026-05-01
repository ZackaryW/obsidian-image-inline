import test from 'node:test';
import assert from 'node:assert/strict';
import { Base64File } from '../../src/utils/base64/base64File';
import {
	buildOriginalBackupFilename,
	createImageFile,
} from '../../src/utils/base64/imagePersistence';

/**
 * Verifies that backup filenames keep the source extension instead of forcing PNG.
 */
test('buildOriginalBackupFilename preserves the source extension', () => {
	const file = new Base64File({
		buffer: Uint8Array.from([1, 2, 3]).buffer,
		filename: 'photo.jpeg',
		mimeType: 'image/jpeg',
	});

	assert.equal(
		buildOriginalBackupFilename(file, '2026-04-30T12-00-00-000Z'),
		'photo_original_2026-04-30T12-00-00-000Z.jpeg'
	);
});

/**
 * Verifies that saved browser File objects preserve MIME metadata and allow filename overrides.
 */
test('createImageFile preserves MIME type and normalizes override filenames', () => {
	const file = new Base64File({
		buffer: Uint8Array.from([1, 2, 3]).buffer,
		filename: 'diagram.webp',
		mimeType: 'image/webp',
	});

	const browserFile = createImageFile(file, 'backup');

	assert.equal(browserFile.name, 'backup.webp');
	assert.equal(browserFile.type, 'image/webp');
});