import { Editor, Notice } from "obsidian";
import ImageToBase64Plugin from "../main";
import { registerOnPaste, registerPaletteCommand } from "./clipboard";
import { registerCursorListener } from "./cursor";
import { registerDrag } from "./drag";
import { ConvertAllModal } from "../modals/convertAll";


export async function registerDeprecatedCommands(plugin: ImageToBase64Plugin) {
    if (!plugin.settings.enableDeprecatedMethods) {
        return;
    }
	new Notice("Deprecated commands will be removed at a later major version.");
    // Register the deprecated commands
    plugin.addCommand({
        id: "convert-all-images-to-base64",
			name: "Convert all image attachments to inline base64",
			editorCallback: async (editor: Editor) => {
				new ConvertAllModal(
					this.app,
					async (filters: {
						skipInternalLinks: boolean;
						skipRemoteLinks: boolean;
						customFilters: string[];
						forAllFiles: boolean;
					}) => {
						let targetFiles: any[];
						if (filters.forAllFiles) {
							// filter to only include md
							targetFiles = this.app.vault.getFiles().filter(
								(file: { extension: string; }) => file.extension === "md"
							);
							console.log("Converting " + targetFiles.length + " files");
						} else {
							const afile = this.app.workspace.getActiveFile();
							if (!afile) return;
							targetFiles = [afile];
						}
						
						// Convert all image attachments to inline base64
						for (const file of targetFiles) {
							console.log("Converting file " + file.path);
							const content = await this.app.vault.read(file);
							const updatedContent =
								await this.convertAllImagesToBase64(
									content,
									file,
									filters
								);

							await this.app.vault.modify(file, updatedContent);
						}

						new Notice(
							"All image attachments have been converted to inline base64."
						);
					}).open();
			},
		});

	}
export async function registerAllCommands(plugin: ImageToBase64Plugin) {
    await registerPaletteCommand(plugin);
    await registerOnPaste(plugin);

    await registerDrag(plugin);

    await registerCursorListener(plugin);

    await registerDeprecatedCommands(plugin);
}