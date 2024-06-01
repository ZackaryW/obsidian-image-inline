import { TFile, Vault} from "obsidian";

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export async function fileToBase64(file: TFile, vault: Vault): Promise<string> {
    const arrayBuffer = await vault.readBinary(file);
    return arrayBufferToBase64(arrayBuffer);
}

export async function fetchRemoteImageToBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBufferToBase64(arrayBuffer);
}