import { Editor, Notice } from "obsidian";
import { toBase64, formatMarkdownBase64 } from "./base64";
import ImageToBase64Plugin from "src/main";

export async function gatherClipboardItems(editor: Editor): Promise<any[]> {
	try {
		const items = await navigator.clipboard.read();
		return filterClipboardItems(items);
	} catch (err) {
		console.error("Failed to read clipboard contents: ", err);
		new Notice("Error accessing clipboard.");
		return []; // Return an empty array in case of error
	}
}

async function filterClipboardItems(items: ClipboardItem[]): Promise<any[]> {
	let filteredItems = [];
	for (const clipboardItem of items) {
		for (const type of clipboardItem.types) {
			if (!type.startsWith("image")) {
				continue;
			}
			
			const blob = await clipboardItem.getType(type);
			filteredItems.push(blob);
		}
	}
	return filteredItems;
}

export async function editorProcessItems(
	editor: Editor,
	items: any[],
	plugin: ImageToBase64Plugin
): Promise<void> {

	for (const item of items) {
		const base64 = await toBase64(item, plugin);
		const imgMarkdown = formatMarkdownBase64(base64, "") + "\n";

		const cursor = editor.getCursor();
		editor.replaceRange(imgMarkdown, cursor);

		const newCursorPos = {
			line: cursor.line + 1,
			ch: 0,
		};

		editor.setCursor(newCursorPos);
	}
}