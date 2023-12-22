// Utility function to convert an image file to a base64 string
export async function convertImageFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            if (event.target && event.target.result) {
                resolve(event.target.result as string);
            } else {
                reject('Failed to convert image to base64');
            }
        };
        reader.onerror = function(error) {
            reject(error);
        };
        reader.readAsDataURL(file);
    });
}