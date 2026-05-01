type InlineImageLinkBounds = {
    start: number;
    end: number;
};

/**
 * Finds the boundaries of an inline image data URL on a single Markdown line.
 */
export function findInlineImageLinkBounds(line: string): InlineImageLinkBounds | null {
    if (!(line.startsWith("![[") || line.startsWith("![")) && !line.includes("(data:image/")) {
        return null;
    }

    if (!line.includes("(data:image/")) {
        return null;
    }

    const linkStart = line.indexOf("(data:image/");
    if (linkStart === -1) {
        return null;
    }

    let openParens = 1;
    for (let index = linkStart + 1; index < line.length; index++) {
        if (line[index] === "(") {
            openParens++;
        }
        if (line[index] === ")") {
            openParens--;
        }
        if (openParens === 0) {
            return { start: linkStart, end: index };
        }
    }

    return null;
}

/**
 * Calculates the cursor destination that escapes an inline image data URL when needed.
 */
export function getEscapedCursorCh(line: string, cursorCh: number): number | null {
    const bounds = findInlineImageLinkBounds(line);
    if (!bounds) {
        return null;
    }

    if (cursorCh <= bounds.start || cursorCh > bounds.end) {
        return null;
    }

    return bounds.end + 1;
}