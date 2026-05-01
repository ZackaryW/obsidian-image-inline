![Image Inline banner](docs/banner.png)

# Image Inline

Image Inline is for Obsidian users who want images to stay with the note instead of turning every paste into another attachment file.

Some vaults just work better that way. If you mostly paste screenshots, sketches, or quick reference images and want the note to remain self-contained, this plugin is built for that workflow.

## Why people use it

- Paste an image and keep writing.
- Drop an image into a note without managing a separate file.
- Avoid clutter from attachment folders when the image only matters inside one note.
- Keep long inline image content from taking over the editor view.

## What it helps with

### Everyday use

- Paste images directly into a note.
- Drag and drop images into a note.
- Keep inline image text visually collapsed so the note stays readable.
- Jump the cursor out of the image data section more easily while editing.

### When you want more control

- Convert a local image embed into an inline image.
- Convert an online image link into an inline image.
- Export an inline image back to your vault as a normal file.
- Batch-convert images in the current note, current folder, or entire vault.
- Batch-export images in the current note, current folder, or entire vault.

## Flexible image handling

If you want a simple setup, you can just inline pasted and dropped images.

If you want more control, the plugin also supports resize and threshold rules:

- Keep smaller images inline and save larger ones as attachments.
- Resize larger images before inlining them.
- Optionally keep a backup of the original image.

## In Obsidian

The plugin adds support in three places:

- Editor paste and drop behavior
- Editor context menu actions
- Command palette actions for larger cleanup or conversion jobs

## Settings

You can turn on or off:

- Convert on paste
- Convert on drop
- Auto escape from inline image data
- Resize behavior
- Size thresholds
- Resize percentage
- Original image backup behavior

## Good fit for

- Personal knowledge bases that favor self-contained notes
- Screenshot-heavy workflows
- Travel, research, or archive vaults where portability matters
- People who dislike attachment folder sprawl

## Notes

- Image Inline currently focuses on the common note image workflows used in this plugin.
- Some actions are designed around common `png`, `jpg`, and `jpeg` image embeds.
- The plugin works on mobile as well as desktop.

## Development

For local development:

- `npm run build`
- `npm run test:utils`

