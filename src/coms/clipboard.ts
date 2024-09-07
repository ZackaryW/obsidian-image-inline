import { editorProcessItems, gatherClipboardItems } from "src/utils/editor";
import ImageToBase64Plugin from "../main";
import { Editor } from "obsidian";

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
				if (!plugin.settings.convertOnPaste || !evt.clipboardData) {
					return;
				}

				for (const item of Array.from(evt.clipboardData.items)) {
					if (item.type.startsWith("image")) {
						evt.preventDefault();
						break;
					}
				}

				const items = await gatherClipboardItems(editor);
				if (!items) {
					return;
				}

				await editorProcessItems(editor, items, plugin);
			}
		)
	);
}
