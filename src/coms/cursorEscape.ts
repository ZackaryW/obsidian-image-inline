import { Editor, MarkdownView } from "obsidian";
import ImageInlinePlugin from "../main";
import { getEscapedCursorCh } from "./cursorEscapeHelpers";

/**
 * Registers event-driven cursor escaping for inline image data URLs in Markdown editors.
 */
export function registerCursorEscape(plugin: ImageInlinePlugin) {
    /**
     * Checks the active Markdown editor and escapes the cursor when it lands inside a data URL.
     */
    const syncCursorEscape = (): void => {
        if (!plugin.settings.autoEscapeLink) {
            return;
        }

        const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView || activeView.getViewType() !== "markdown") {
            return;
        }

        checkCursorPosition(activeView.editor);
    };

    plugin.registerDomEvent(document, "selectionchange", () => {
        syncCursorEscape();
    });

    plugin.registerEvent(plugin.app.workspace.on("editor-change", () => {
        syncCursorEscape();
    }));
}

/**
 * Moves the cursor out of inline image data URLs while preserving normal editing elsewhere.
 */
function checkCursorPosition(editor: Editor) {
    const cursor = editor.getCursor();
    const selection = editor.getSelection();

    // Only proceed if there's no selection (single cursor)
    if (selection) {
        return;
    }

    const line = editor.getLine(cursor.line);
    const escapedCursorCh = getEscapedCursorCh(line, cursor.ch);
    if (escapedCursorCh === null) {
        return;
    }

    editor.setCursor({
        line: cursor.line,
        ch: escapedCursorCh,
    });
}
