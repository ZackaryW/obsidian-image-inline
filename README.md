# Image Inline
This is a niche plugin that allows you to inline images in your notes.

## Background
There are always some vaults where you do not want attachment images to be part of the notes.

## Features 🎉

![banner](/docs//banner.png)

### General
- Paste/Drop images to inline them
- Prevent the expansion of base64 data strings
- Image Resizing Options (expanded below)

### Context Menus
- Option to export the image to media folder
- Copy to clipboard (wip)
- Directly convert image to base64 

### Command Palette
- Batch export images in a note/vault
- Batch convert images in a note/vault

## Image Resizing Options
### Option 1: Using size as a threshold
- embed small images directly, and large images as attachments

### Option 2: Resize large images
- resize large images based on the setting, while also having the option to save the original images in the media folder

## What Changed in v3.0?
- Fixed the mobile issues (previously using non mobile supported features)
- Ditched the width/height trigger to make the process less expensive
- Implemented all the requested features

## Dev
- Used custom tools for testing [obs-dev](https://github.com/ZackaryW/obs-dev)
