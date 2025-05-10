import { Editor, MarkdownView } from "obsidian";
import ImageInlinePlugin from "../main";

export function registerCursorEscape(plugin: ImageInlinePlugin) {
    plugin.registerInterval(
        window.setInterval(() => {
            if (!plugin.settings.autoEscapeLink) {
                return;
            }

            const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView && activeView.getViewType() === "markdown") {
                const editor = activeView.editor;
                if (editor) {
                    checkCursorPosition(editor);
                }
            }
        }, 100)
    );
}

function checkCursorPosition(editor: Editor) {
    const cursor = editor.getCursor();
    const selection = editor.getSelection();

    // Only proceed if there's no selection (single cursor)
    if (selection) {
        return;
    }

    const line = editor.getLine(cursor.line);
    
    // Check if line starts with ![ and contains (data:image/
    if (!(line.startsWith("![") && line.includes("(data:image/"))) {
        return;
    }

    // Find the start and end of the base64 image link
    const linkStart = line.indexOf("(data:image/");
    if (linkStart === -1) {
        return;
    }

    // Find the matching closing parenthesis
    let openParens = 1;
    let linkEnd = linkStart;
    for (let i = linkStart + 1; i < line.length; i++) {
        if (line[i] === '(') openParens++;
        if (line[i] === ')') openParens--;
        if (openParens === 0) {
            linkEnd = i;
            break;
        }
    }

    // Only proceed if cursor is within the link boundaries
    if (cursor.ch <= linkStart || cursor.ch > linkEnd) {
        return;
    }

    // Find the nearest closing parenthesis to the right of the cursor
    const remainingText = line.slice(cursor.ch);
    const nextClosingParen = remainingText.indexOf(")");
    
    if (nextClosingParen !== -1) {
        // Move cursor to the position after the closing parenthesis
        editor.setCursor({ 
            line: cursor.line, 
            ch: cursor.ch + nextClosingParen + 1 
        });
    } else {
        // If no closing parenthesis found, move to next line as fallback
        editor.setCursor({ line: cursor.line + 1, ch: 0 });
    }
}
