import { Buffer } from "buffer";
import ImageToBase64Plugin from "src/main";

/**
 * Loads a base64 image string and returns a Buffer.
 * @param base64String The base64 encoded image string.
 * @returns A Buffer containing the image data.
 */
export function loadBase64Image(base64String: string): Buffer {
	// Remove data URL prefix if present
	const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
	return Buffer.from(base64Data, "base64");
}

/**
 * Extracts string bytes into an image buffer.
 * @param imageString The image string (can be base64 or raw bytes).
 * @returns A Promise that resolves to a Buffer containing the image data.
 */
export async function extractImageBytes(imageString: string): Promise<Buffer> {
	try {
		// First, try to decode as base64
		return loadBase64Image(imageString);
	} catch {
		// If not base64, assume it's raw bytes
		return Buffer.from(imageString, "binary");
	}
}

/**
 * Resizes an image by a given percentage.
 * @param imageBuffer The input image as a Buffer.
 * @param percentage The percentage to resize the image (e.g., 50 for 50%).
 * @returns A Promise that resolves to a Buffer containing the resized image data.
 */
export async function resizeImageByPercentage(
	imageBuffer: Buffer,
	percentage: number
): Promise<Buffer> {
	const image = new Image();
	image.src = "data:image/png;base64," + imageBuffer.toString("base64");

	return new Promise((resolve, reject) => {
		image.onload = () => {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				return reject(new Error("Unable to get canvas context"));
			}

			const newWidth = Math.round(image.width * (percentage / 100));
			const newHeight = Math.round(image.height * (percentage / 100));
			canvas.width = newWidth;
			canvas.height = newHeight;
			ctx.drawImage(image, 0, 0, newWidth, newHeight);

			canvas.toBlob((blob) => {
				if (!blob) {
					return reject(
						new Error("Unable to convert canvas to Blob")
					);
				}
				const reader = new FileReader();
				reader.onloadend = () => {
					resolve(Buffer.from(reader.result as ArrayBuffer));
				};
				reader.readAsArrayBuffer(blob);
			}, "image/png");
		};

		image.onerror = (err) => {
			reject(new Error("Unable to load image"));
		};
	});
}

export async function resizingRulesCheck(
	buf: Buffer,
	plugin: ImageToBase64Plugin
): Promise<number> {
	if (!plugin.settings.enableResizing) {
		return 100;
	}

	const image = new Image();
	image.src = "data:image/png;base64," + buf.toString("base64");

	return new Promise((resolve, reject) => {
		image.onload = () => {
			const width = image.width;
			const height = image.height;
			const filesize = buf.length;

			if (!width || !height) {
				return reject(
					new Error("Unable to determine image dimensions")
				);
			}

			let minpercentage = 100;
			for (const [string, percentage] of plugin.settings.resizingRules) {
				if (!string) {
					continue;
				}
				try {
					if (string.includes("x")) {
						const [ruleWidth, ruleHeight] = string
							.split("x")
							.map(Number);
						if (width >= ruleWidth && height >= ruleHeight) {
							minpercentage = Math.min(minpercentage, percentage);
						}
					} else {
						const size = Number(string);
						if (filesize >= size) {
							minpercentage = Math.min(minpercentage, percentage);
						}
					}
				} catch (e) {
					console.error("Error parsing resizing rules:", e);
				}
			}
			resolve(minpercentage);
		};

		image.onerror = (err) => {
			reject(new Error("Unable to load image"));
		};
	});
}

function getImageSizeAndFileSize(buf: Buffer): Promise<{ width: number; height: number; filesize: number }> {
    return new Promise((resolve, reject) => {
        if (!buf || buf.length === 0) {
            return reject(new Error("Invalid buffer"))
        }

        const image = new Image()
        image.src = "data:image/png;base64," + buf.toString("base64")

        image.onload = () => {
            const width = image.width
            const height = image.height
            const filesize = buf.length / 1024; // Convert to KB

            if (!width || !height) {
                return reject(new Error("Unable to determine image dimensions"))
            }

            resolve({ width, height, filesize })
        }

        image.onerror = () => {
            reject(new Error("Unable to load image"))
        }
    })
}

export async function checkThreshold(
	buf: Buffer,
	plugin: ImageToBase64Plugin
): Promise<boolean> {
	if (buf.length === 0) {
		return false;
	}

	if (!plugin.settings.convertBase64ByThresholdToggle) {
		return false;
	}
	const { filesize } = await getImageSizeAndFileSize(buf)
	const res = (plugin.settings.convertBase64ByThreshold >= filesize) == plugin.settings.convertBase64ByThresholdStrategy
	if (res){
		console.log("paste to base64 is ignored for this image")
	}
	return res
}