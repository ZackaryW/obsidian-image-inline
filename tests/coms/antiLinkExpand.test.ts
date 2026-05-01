import test from 'node:test';
import assert from 'node:assert/strict';
import { findInlineImageDataUrlRanges } from '../../src/coms/antiLinkExpand';

/**
 * Verifies that inline image data URLs are located within a single text slice.
 */
test('findInlineImageDataUrlRanges returns base64 spans with offsets', () => {
    const text = 'before data:image/png;base64,AAAA) middle data:image/webp;base64,BBBB) after';

    assert.deepEqual(findInlineImageDataUrlRanges(text), [
        { from: 7, to: 33 },
        { from: 42, to: 69 },
    ]);
});

/**
 * Verifies that offsets are applied when mapping slice-relative matches back to document positions.
 */
test('findInlineImageDataUrlRanges applies document offsets', () => {
    assert.deepEqual(findInlineImageDataUrlRanges('x data:image/png;base64,AAAA)', 10), [
        { from: 12, to: 38 },
    ]);
});