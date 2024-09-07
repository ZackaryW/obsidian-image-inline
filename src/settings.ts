import { PluginSettingTab, Setting, App } from "obsidian";
import type ImageToBase64Plugin from "./main";
import { registerDeprecatedCommands } from "./coms/__init__";

export interface ImageToBase64Settings {
	convertOnPaste: boolean;
	convertOnDrop: boolean;
	autoAvoidExpansion: boolean;

	enableResizing: boolean;
	// tuples <int, int>
	resizingRules: Array<[string, number]>;

    enableDeprecatedMethods : boolean;
}

export const DEFAULT_SETTINGS: ImageToBase64Settings = {
	convertOnPaste: true,
	convertOnDrop: true,
	autoAvoidExpansion: false,
	enableResizing: false,
	resizingRules: [
		["6000", 80],
		["12000", 60],
	],
    enableDeprecatedMethods : false,
};

export class ImageToBase64SettingTab extends PluginSettingTab {
	plugin: ImageToBase64Plugin;

	constructor(app: App, plugin: ImageToBase64Plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Convert on Paste")
			.setDesc("Convert images pasted into the editor to base64")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.convertOnPaste)
					.onChange(async (value) => {
						this.plugin.settings.convertOnPaste = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Convert on Drop")
			.setDesc("Convert images dropped into the editor to base64")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.convertOnDrop)
					.onChange(async (value) => {
						this.plugin.settings.convertOnDrop = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Auto Scroll")
			.setDesc(
				"Automatically prevent the expansion of base64 image links.\
                Currently only works with single images."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoAvoidExpansion)
					.onChange(async (value) => {
						this.plugin.settings.autoAvoidExpansion = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Enable Resizing")
			.setDesc("Enable resizing of base64 image links")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableResizing)
					.onChange(async (value) => {
						this.plugin.settings.enableResizing = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Resizing Rules")
			.setDesc("Rules for resizing base64 image links")

			.addButton((button) => {
				button.setButtonText("Add Rule").onClick(() => {
					const rule: [string, number] = ["", 0];
					this.plugin.settings.resizingRules.push(rule);
					this.plugin.saveSettings();
					this.display();
				});
			});

		this.plugin.settings.resizingRules.forEach((rule, index) => {
			const ruleType = rule[0].includes("x")
				? "X x Y"
				: "Size";
			const ruleTypeColor =
				ruleType === "X x Y" ? "red" : "green";
			const ruleSetting = new Setting(containerEl);

			const ruleLabel = ruleSetting.settingEl.createEl("span", {
				text: ruleType,
				attr: {
					style: `color: ${ruleTypeColor}; margin-right: 10px; float: left;`,
				},
			});

			ruleSetting.settingEl.insertBefore(ruleLabel, ruleSetting.settingEl.firstChild);

			ruleSetting
				.addText((text) =>
					text
						.setPlaceholder("Dimension/Size")
						.setValue(rule[0])
						.onChange(async (value) => {
							rule[0] = value;
							await this.plugin.saveSettings();
							ruleLabel.textContent = rule[0].includes("x")
								? "X x Y"
								: "Size";
						})
				)
				.addText((text) =>
					text
						.setPlaceholder("Resize%")
						.setValue(rule[1].toString())
						.onChange(async (value) => {
							rule[1] = Number(value);
							await this.plugin.saveSettings();
						})
				)
				.addButton((button) => {
					button.setButtonText("Remove").onClick(async () => {
						this.plugin.settings.resizingRules.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					});
				});
		});

        // enable deprecated methods toggle
        new Setting(containerEl)
            .setName("Enable deprecated methods")
            .setDesc("Enable deprecated methods")
            .addToggle((toggle) =>
                toggle
            .setValue(this.plugin.settings.enableDeprecatedMethods)
            .onChange(async (value) => {
                        this.plugin.settings.enableDeprecatedMethods = value;
                        await this.plugin.saveSettings();
                        if (value) {
                            toggle.setDisabled(true);
							
							this.display();
							registerDeprecatedCommands(this.plugin);
                        }
                    })
            );

	}
}
