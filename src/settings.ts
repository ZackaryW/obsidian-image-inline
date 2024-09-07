import { PluginSettingTab, Setting, App, TextComponent } from "obsidian";
import type ImageToBase64Plugin from "./main";
import { registerDeprecatedCommands } from "./coms/__init__";

export interface ImageToBase64Settings {
	convertOnPaste: boolean;
	convertOnDrop: boolean;
	autoAvoidExpansion: boolean;

	convertBase64ByThresholdToggle : boolean;
	convertBase64ByThresholdStrategy : boolean;
	convertBase64ByThreshold : number;

	enableResizing: boolean;
	// tuples <int, int>
	resizingRules: Array<[string, number]>;

    enableDeprecatedMethods : boolean;
}

export const DEFAULT_SETTINGS: ImageToBase64Settings = {
	convertOnPaste: true,
	convertOnDrop: true,
	autoAvoidExpansion: false,
	convertBase64ByThresholdToggle : false,
	convertBase64ByThresholdStrategy : false,
	convertBase64ByThreshold : 0,
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
			.setName("Convert on paste")
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
			.setName("Convert on drop")
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
			.setName("Prevent link expansion")
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
		
		//test
		new Setting(containerEl)
			.setName("Convert base64 by threshold")
			.setDesc("Flip the toggle to enable this feature, does not work for batches")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.convertBase64ByThresholdToggle)
					.onChange(async (value) => {
						this.plugin.settings.convertBase64ByThresholdToggle = value
						await this.plugin.saveSettings()
						thresholdValue.settingEl.style.display = value ? "block" : "none"
						thresholdDirection.settingEl.style.display = value ? "block" : "none"
					})
			)
		
		const thresholdDirection = new Setting(containerEl)
			.setName("How is it handled?")
			.setDesc("Choose whether to trigger if its larger or smaller than the threshold")
				.addDropdown((dropdown) =>
   				dropdown
   					.addOption("larger", "Larger than threshold")
   					.addOption("smaller", "Smaller than threshold")
   					.setValue(this.plugin.settings.convertBase64ByThresholdStrategy ? "larger" : "smaller")
   					.onChange(async (value) => {
   						this.plugin.settings.convertBase64ByThresholdStrategy = value === "larger"
   						await this.plugin.saveSettings();
   					})
   			);
   

		const thresholdValue = new Setting(containerEl)
			.setName("Threshold (KB)")
			.setDesc("Convert images larger than this size (in KB) to base64")
			.addText((text) =>
				text
					.setPlaceholder("Enter threshold in KB")
					.setValue(String(this.plugin.settings.convertBase64ByThreshold || DEFAULT_SETTINGS.convertBase64ByThreshold))
					.onChange(async (value) => {
						const numValue = Number(value)
						if (!isNaN(numValue)) {
							this.plugin.settings.convertBase64ByThreshold = numValue
							await this.plugin.saveSettings()
						} 
					})
			)

		thresholdValue.settingEl.style.display = this.plugin.settings.convertBase64ByThresholdToggle ? "block" : "none"
		thresholdDirection.settingEl.style.display = this.plugin.settings.convertBase64ByThresholdToggle ? "block" : "none"

		let resizingRulesList: Setting[] = [];
		

		new Setting(containerEl)
			.setName("Enable resizing")
			.setDesc("Enable resizing of base64 image links")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableResizing)
					.onChange(async (value) => {
						this.plugin.settings.enableResizing = value;
						await this.plugin.saveSettings();
						resizingRulesAddButton.settingEl.style.display = value ? "block" : "none";
						resizingRulesList.forEach((rule) => {
							rule.settingEl.style.display = value ? "block" : "none"
						});
						this.display();
					})
			);

		let resizingRulesAddButton = new Setting(containerEl)
			.setName("Resizing rules")
			.setDesc("Rules for resizing base64 image links")

			.addButton((button) => {
				button.setButtonText("Add Rule").onClick(() => {
					const rule: [string, number] = ["", 0];
					this.plugin.settings.resizingRules.push(rule);
					this.plugin.saveSettings();

					// hide rule setting list if disabled
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
			resizingRulesList.push(ruleSetting);
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
		resizingRulesAddButton.settingEl.style.display = this.plugin.settings.enableResizing ? "block" : "none";
		resizingRulesList.forEach((rule) => {
			rule.settingEl.style.display = this.plugin.settings.enableResizing ? "block" : "none"
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
