import { Buffer } from "buffer";
import { TFile } from "obsidian";

import ImageToBase64Plugin from "../main";
import { resizeImageByPercentage, resizingRulesCheck } from "./resizeSize";
/**
 * Converts various types of objects into base64 encoded strings.
 * @param input - The input object to be encoded (image, URL, file reference, etc.)
 * @returns A Promise that resolves to the base64 encoded string
 */
export async function toBase64(
	input: string | Blob | TFile | ArrayBuffer,
	plugin: ImageToBase64Plugin
): Promise<string> {
	let imageBuffer: Buffer;

	if (typeof input === "string" && input.startsWith("http")) {
		const response = await fetch(input);
		const arrayBuffer = await response.arrayBuffer();
		imageBuffer = Buffer.from(arrayBuffer);
	} else if (typeof input === "string") {
		imageBuffer = Buffer.from(input);
	} else if (input instanceof TFile) {
		const arrayBuffer = await input.vault.readBinary(input);
		imageBuffer = Buffer.from(arrayBuffer);
	} else if (input instanceof ArrayBuffer) {
		imageBuffer = Buffer.from(input);
	} else if (input instanceof Blob) {
		const arrayBuffer = await input.arrayBuffer();
		imageBuffer = Buffer.from(arrayBuffer);
	} else {
		throw new Error("Unsupported input type");
	}

	const resizePercentage = await resizingRulesCheck(imageBuffer, plugin);

	// Convert to image using sharp
	console.log(`Resizing image by ${resizePercentage}% for ${input}`);
	const image = await resizeImageByPercentage(imageBuffer, resizePercentage); 
	
	// Convert PNG buffer to base64
	return image.toString('base64');
}

var globalCounter: number = 0;

/**
 * Formats a base64 encoded string as a markdown image.
 * @param base64String - The base64 encoded string to be formatted
 * @param altText - The alternative text for the image
 * @returns A string representing the markdown formatted image
 */
export function formatMarkdownBase64(
	base64String: string,
	altText?: string
): string {
	if (!altText) {
		altText = "image" + globalCounter++;
	}
	if (!base64String.startsWith("data:image/")) {
		base64String = `data:image/png;base64,${base64String}`;
	}

	return `![${altText}](${base64String})`;
}
