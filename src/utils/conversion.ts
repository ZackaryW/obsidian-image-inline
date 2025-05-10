import { TFile } from "obsidian";

export class Base64File {
    buffer: ArrayBuffer;
    filename: string;

    constructor(buffer: ArrayBuffer, filename?: string) {
        this.buffer = buffer;
        this.filename = filename || "image";
    }

    get size() {
        return this.buffer.byteLength;
    }

    to64String() {
        const bytes = new Uint8Array(this.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    to64Link() {
        return `![${this.filename}](data:image/png;base64,${this.to64String()})`;
    }

    //class methods
    static from64Link(link: string) {
        const match = link.match(/!\[(.*?)\]\(data:image\/png;base64,(.*?)\)/);
        if (!match) return null;
        const filename = match[1];
        const base64 = match[2];
        const buffer = Buffer.from(base64, 'base64');
        return new Base64File(buffer, filename);
    }

    static from64String(base64: string, filename?: string) {
        const buffer = Buffer.from(base64, 'base64');
        return new Base64File(buffer, filename);
    }

    static async fromFile(file: File) {
        const arrayBuffer = await file.arrayBuffer();
        return new Base64File(arrayBuffer, file.name);
    }

    static async fromTFile(tfile: TFile) {
        const arrayBuffer = await tfile.vault.readBinary(tfile);
        return new Base64File(arrayBuffer, tfile.name);
    }
}

export class Base64Conversion {
    async fromClipboardEvent(event: ClipboardEvent): Promise<Base64File | null> {
        const items = event.clipboardData?.items;
        if (!items) return null;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    return this.fromFile(file);
                }
            }
        }
        return null;
    }

    async fromClipboard(): Promise<Base64File | null> {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
                    const blob = await item.getType('image/png') || await item.getType('image/jpeg');
                    if (blob) {
                        const arrayBuffer = await blob.arrayBuffer();
                        return new Base64File(arrayBuffer);
                    }
                }
            }
        } catch (error) {
            console.error('Error reading from clipboard:', error);
        }
        return null;
    }

    async fromFile(file: File): Promise<Base64File> {
        const arrayBuffer = await file.arrayBuffer();
        return new Base64File(arrayBuffer);
    }
    async fromTFile(tfile: TFile): Promise<Base64File> {
        const arrayBuffer = await tfile.vault.readBinary(tfile);
        return new Base64File(arrayBuffer);
    }   

    async resize(file: Base64File, percentage: number): Promise<Base64File> {
        return new Promise((resolve, reject) => {
            const blob = new Blob([file.buffer]);
            const imageUrl = URL.createObjectURL(blob);
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                const newWidth = Math.round(img.width * (percentage / 100));
                const newHeight = Math.round(img.height * (percentage / 100));
                
                canvas.width = newWidth;
                canvas.height = newHeight;
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Could not create blob from canvas'));
                        return;
                    }
                    
                    blob.arrayBuffer().then(arrayBuffer => {
                        URL.revokeObjectURL(imageUrl);
                        resolve(new Base64File(arrayBuffer));
                    }).catch(reject);
                }, 'image/png');
            };

            img.onerror = () => {
                URL.revokeObjectURL(imageUrl);
                reject(new Error('Failed to load image'));
            };

            img.src = imageUrl;
        });
    }
}