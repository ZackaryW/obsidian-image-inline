import { App, Editor, Modal, Notice, Plugin, TFile } from "obsidian";

class ConvertToBase64Modal extends Modal {
    private file: TFile;
    private editor: Editor;

    constructor(app: App, file: TFile, editor: Editor) {
        super(app);
        this.file = file;
        this.editor = editor;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Convert to Base64' });

        try {
            // Read the file content
            const arrayBuffer = await this.app.vault.readBinary(this.file);
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            const mimeType = this.file.extension === 'png' ? 'image/png' : 'image/jpeg';
            const base64Data = `data:${mimeType};base64,${base64}`;

            // Create the markdown link
            const markdown = `![[${this.file.name}]]`;
            const newMarkdown = `![${this.file.name}](${base64Data})`;

            //console.log('Original markdown:', markdown);
            //console.log('New markdown:', newMarkdown);

            // Replace the content
            const cursor = this.editor.getCursor();
            const line = this.editor.getLine(cursor.line);
            //console.log('Current line:', line);
            
            const newLine = line.replace(markdown, newMarkdown);
            //console.log('Replaced line:', newLine);
            
            // Get the full line range
            const lineStart = this.editor.posToOffset({ line: cursor.line, ch: 0 });
            const lineEnd = this.editor.posToOffset({ line: cursor.line, ch: line.length });
            
            //console.log('Line range:', { start: lineStart, end: lineEnd });
            
            // Replace the entire line
            this.editor.replaceRange(newLine, 
                this.editor.offsetToPos(lineStart),
                this.editor.offsetToPos(lineEnd)
            );

            new Notice('Image converted to base64');
        } catch (error) {
            new Notice('Failed to convert image: ' + error.message);
        }

        this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export async function registerConvertImage(plugin: Plugin) {
    plugin.registerEvent(
        plugin.app.workspace.on('editor-menu', async (menu, editor) => {
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);
            
            // Check if cursor is on an image embed
            const imageRegex = /!\[\[([^\]\n]+\.(png|jpg|jpeg))\]\]/;
            const match = line.match(imageRegex);
            
            if (match) {
                const imagePath = match[1];
                const activeFile = plugin.app.workspace.getActiveFile();
                if (!activeFile) return;

                // Try to find the file using fileManager
                const file = plugin.app.metadataCache.getFirstLinkpathDest(imagePath, activeFile.path);

                console.log('Original path:', imagePath);
                console.log('File:', file);
                if (file instanceof TFile) {
                    menu.addItem((item) => {
                        item
                            .setTitle("Convert to Base64")
                            .setIcon("code-glyph")
                            .onClick(async () => {
                                new ConvertToBase64Modal(plugin.app, file, editor).open();
                            });
                    });
                }
            }
        })
    );
}

// Add an empty export to make this a module
export {};
