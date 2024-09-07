import { editorProcessItems, gatherClipboardItems } from "../utils/editor";
import ImageToBase64Plugin from "../main";
import { Editor } from "obsidian";
import { formatMarkdownBase64, toBase64 } from "../utils/base64";
import { checkThreshold } from "src/utils/resizeSize";

export async function registerPaletteCommand(plugin: ImageToBase64Plugin) {
	plugin.addCommand({
		id: "paste-image-as-base64",
		name: "Paste image as Base64",
		editorCallback: async (editor: Editor) => {
			const items = await gatherClipboardItems(editor);
			if (items.length === 0) {
				return;
			}

			await editorProcessItems(editor, items, plugin);
		},
	});
}

export async function registerOnPaste(plugin: ImageToBase64Plugin) {
	plugin.registerEvent(
		plugin.app.workspace.on(
			"editor-paste",
			async (evt: ClipboardEvent, editor: Editor) => {
				if (evt.clipboardData?.getData("_flagged")){
					return;
				}

				if (!plugin.settings.convertOnPaste || !evt.clipboardData) {
					return;
				}
				const items = Array.from(
					evt.clipboardData.items
				) 
				
				// if not all of them are image/ type
				if (!items.every((item) => item.type.startsWith("image/"))) {
					return;
				}
				evt.preventDefault();

				items.forEach(async (item) => {
					const file = item instanceof File ? item : item.getAsFile();
					

					if (!file) {
						new Error("No file found");
						return;
					}

					if (await checkThreshold(Buffer.from(await file.arrayBuffer()), plugin)){
						let newClipboardEvent = new ClipboardEvent("paste", {
							bubbles: true,
							cancelable: true,
							clipboardData : new  DataTransfer(),
						});
						newClipboardEvent.clipboardData?.items.add(file);
						newClipboardEvent.clipboardData?.setData("_flagged", 'true');
						evt.target?.dispatchEvent(newClipboardEvent);
						return;
					}

					const base64 = await toBase64(file, plugin);
					const filename = file.name || ``;
					const imgMarkdown = formatMarkdownBase64(base64, filename) + "\n";

					const cursor = editor.getCursor();
					editor.replaceRange(imgMarkdown, cursor);

					const newCursorPos = {
						line: cursor.line + 1,
						ch: 0,
					};

					editor.setCursor(newCursorPos);
				});

			}
		)
	);
}
