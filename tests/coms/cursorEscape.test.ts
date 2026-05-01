import test from 'node:test';
import assert from 'node:assert/strict';
import { findInlineImageLinkBounds, getEscapedCursorCh } from '../../src/coms/cursorEscapeHelpers';

/**
 * Verifies that inline image data URL bounds are found on Markdown image lines.
 */
test('findInlineImageLinkBounds finds inline image data URL boundaries', () => {
    const line = '![img](data:image/png;base64,AAAA)';

    assert.deepEqual(findInlineImageLinkBounds(line), {
        start: 6,
        end: 33,
    });
});

/**
 * Verifies that cursor positions inside the data URL escape to the closing parenthesis.
 */
test('getEscapedCursorCh moves the cursor to the end of the inline data URL', () => {
    const line = '![img](data:image/png;base64,AAAA)';

    assert.equal(getEscapedCursorCh(line, 10), 34);
    assert.equal(getEscapedCursorCh(line, 34), null);
});