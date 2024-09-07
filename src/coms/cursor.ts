import { Editor, MarkdownView } from "obsidian";
import ImageToBase64Plugin from "../main";

export function registerCursorListener(plugin: ImageToBase64Plugin) {

    plugin.registerInterval(
        window.setInterval(() => {
            if (!plugin.settings.autoAvoidExpansion) {
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
    if (cursor.ch < 300){
        return;
    }

    const line = editor.getLine(cursor.line);
    // isbase 64 determined by startswith ![ and (data:image/ in the first 300 characters
    if (!(line.startsWith("![") && line.includes("(data:image/"))) {
        return;
    }
    

    editor.setCursor({ line: cursor.line + 1, ch: 0 });
    
}
