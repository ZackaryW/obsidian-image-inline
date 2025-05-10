import { Plugin } from "obsidian";

export async function registerExportImage(plugin: Plugin) {
    plugin.registerEvent(
        plugin.app.workspace.on('editor-menu', (menu, editor) => {
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);
            
            // Check if cursor is on a base64 image link
            if (line.match(/!\[.*?\]\(data:image\/[^;]+;base64,[^)]+\)/)) {
                menu.addItem((item) => {
                    item
                        .setTitle("Export image")
                        .setIcon("file-down")
                        .onClick(async () => {
                            // Extract base64 data from the line
                            const base64Match = line.match(/data:image\/[^;]+;base64,[^)]+/);
                            if (!base64Match) return;

                            // Create file input element
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/png';
                            
                            // Convert base64 to blob
                            const base64Data = base64Match[0].split(',')[1];
                            const buffer = Buffer.from(base64Data, 'base64');
                            const blob = new Blob([buffer], { type: 'image/png' });
                            
                            // Create download link
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'image.png';
                            
                            // Trigger download
                            document.body.appendChild(a);
                            a.click();
                            
                            // Cleanup
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                        });
                });
            }
        })
    );
}