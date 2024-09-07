import ImageToBase64Plugin from "../main";
import { formatMarkdownBase64, toBase64 } from "src/utils/base64";

export async function registerDrag(plugin: ImageToBase64Plugin) {
    plugin.registerDomEvent(
        document, 'drop', async (event : DragEvent) => {
            if (!plugin.settings.convertOnDrop) {
                return;
            }

            const editor = this.app.workspace.activeEditor?.editor;

            if (!editor) {
                console.log("No editor found");
                return;
            }

            event.preventDefault();
			event.stopPropagation();

            if (event.dataTransfer && event.dataTransfer.files.length > 0) {
				let cursor = editor.getCursor(); // Initial cursor position
				//console.log(`Initial cursor position: ${cursor.line}, ${cursor.ch}`);
				
				Array.from(event.dataTransfer.files).forEach(async (file, index) => {
					console.log(`Processing file ${index + 1}/${event.dataTransfer?.files.length}: ${file.name} (${file.type})`);
					
					if (file.type.startsWith('image')) {
						const arrayBuffer = await file.arrayBuffer();
						const base64 = await toBase64(arrayBuffer, plugin);
						const imgMarkdown = formatMarkdownBase64(base64) + "\n";
						editor.replaceRange(imgMarkdown, cursor);
						
						// Update the cursor position for the next insertion
						cursor = { line: cursor.line + 1, ch: 0 };
						
						// Log the new cursor position
						//console.log(`New cursor position: ${cursor.line}, ${cursor.ch}`);

						editor.setCursor(cursor);
					}
				});
			}
		}, true);
}

