import { App, Modal, Setting } from "obsidian";

export class ConvertAllModal extends Modal {
	private onConfirm: (filters: {
		skipInternalLinks: boolean;
		skipRemoteLinks: boolean;
		customFilters: string[];
		forAllFiles: boolean
	}) => void;
	private skipInternalLinks: boolean = false;
	private skipRemoteLinks: boolean = false;
	private customFilters: string[] = [];
	private forAllFiles: boolean = false;

	constructor(
		app: App,
		onConfirm: (filters: {
			skipInternalLinks: boolean;
			skipRemoteLinks: boolean;
			customFilters: string[];
            forAllFiles: boolean
		}) => void
	) {
		super(app);
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Convert All Images to Base64" });

		contentEl.createEl("p", {
			text: "Do you want to convert all images to base64? You can also add filter schemes to skip certain images.",
		});

		new Setting(contentEl)
			.setName("Skip links starting with ![[xxx]]")
			.addToggle((toggle) =>
				toggle.setValue(this.skipInternalLinks).onChange((value) => {
					this.skipInternalLinks = value;
				})
			);

		new Setting(contentEl)
			.setName("Skip remote image links")
			.addToggle((toggle) =>
				toggle.setValue(this.skipRemoteLinks).onChange((value) => {
					this.skipRemoteLinks = value;
				})
			);

		new Setting(contentEl)
			.setName("Filter Schemes")
			.setDesc(
				"Comma-separated list of keywords to skip (e.g., http, data)"
			)
			.addText((text) =>
				text
					.setPlaceholder("Enter filter schemes")
					.onChange((value) => {
						this.customFilters = value
							.split(",")
							.map((filter) => filter.trim());
					})
			);

        new Setting(contentEl)
            .setName("For all files (Dangerous)")
            .addToggle((toggle) =>
                toggle.setValue(this.forAllFiles).onChange((value) => {
                    this.forAllFiles = value;
                })
            );

		new Setting(contentEl)
			.addButton((button) =>
				button
					.setButtonText("Convert")
					.setCta()
					.onClick(() => {
						this.onConfirm({
							skipInternalLinks: this.skipInternalLinks,
							skipRemoteLinks: this.skipRemoteLinks,
							customFilters: this.customFilters,
							forAllFiles: this.forAllFiles
						});
						this.close();
					})
			)
			.addButton((button) =>
				button.setButtonText("Cancel").onClick(() => {
					this.close();
				})
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export function shouldSkipImage(
	link: string,
	imagePath: string,
	filters: {
		skipInternalLinks: boolean;
		skipRemoteLinks: boolean;
		customFilters: string[];
        forAllFiles: boolean
	}
): boolean {
	if (filters.skipInternalLinks && link.startsWith("![[")) {
		return true;
	}

	if (filters.skipRemoteLinks && imagePath.startsWith("http")) {
		return true;
	}

	for (const filter of filters.customFilters) {
		if (filter.includes("*")) {
			const regex = new RegExp(filter.replace("*", ".*"));
			if (regex.test(imagePath)) {
				return true;
			}
		}

		if (link.includes(filter)) {
			return true;
		}
	}

	return false;
}
