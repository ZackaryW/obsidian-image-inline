import { checkThreshold } from "../utils/resizeSize";
import ImageToBase64Plugin from "../main";
import { formatMarkdownBase64, toBase64 } from "../utils/base64";

export async function registerDrag(plugin: ImageToBase64Plugin) {
	plugin.registerDomEvent(
		document,
		"drop",
		async (event: DragEvent) => {
			// check if flagged
			if (event.dataTransfer?.getData("_flagged") === "true") {
				return;
			}

			if (!plugin.settings.convertOnDrop) {
				return;
			}

			const editor = this.app.workspace.activeEditor?.editor;

			if (!editor) {
				console.log("No editor found");
				return;
			}

			if (!event.dataTransfer || event.dataTransfer.files.length == 0) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();

			const itemsCopy = Array.from(event.dataTransfer.files);

			let cursor = editor.getCursor(); // Initial cursor position

			itemsCopy.forEach(async (file, index) => {
				console.log(
					`Processing file ${index + 1}/${
						event.dataTransfer?.files.length
					}: ${file.name} (${file.type})`
				);
				const arrayBuffer = await file.arrayBuffer();

				if (
					!file.type.startsWith("image") ||
					(await checkThreshold(Buffer.from(arrayBuffer), plugin))
				) {
					console.log("Redispatching default drop event for file: ", file.name);
					const newDropEvent = new DragEvent("drop", {
						bubbles: true,
						cancelable: true,
						dataTransfer: new DataTransfer(),
					});
					newDropEvent.dataTransfer?.items.add(file);
					//set a flag
					newDropEvent.dataTransfer?.setData('_flagged', 'true');
					event.target?.dispatchEvent(newDropEvent);
					
					return;
				}

				const base64 = await toBase64(arrayBuffer, plugin);
				const imgMarkdown = formatMarkdownBase64(base64) + "\n";
				editor.replaceRange(imgMarkdown, cursor);

				// Update the cursor position for the next insertion
				cursor = { line: cursor.line + 1, ch: 0 };

				// Log the new cursor position
				//console.log(`New cursor position: ${cursor.line}, ${cursor.ch}`);

				editor.setCursor(cursor);
			});
		},
		true
	);
}
