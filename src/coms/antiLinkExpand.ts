import { Range } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";

const INLINE_IMAGE_DATA_URL_REGEX = /data:image\/[^;]+;base64,[^)]+/g;

type DataUrlRange = {
    from: number;
    to: number;
};

/**
 * Finds inline image data URL segments inside a text slice and maps them back to document offsets.
 */
export function findInlineImageDataUrlRanges(text: string, offset = 0): DataUrlRange[] {
    const ranges: DataUrlRange[] = [];
    const regex = new RegExp(INLINE_IMAGE_DATA_URL_REGEX);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        ranges.push({
            from: offset + match.index,
            to: offset + match.index + match[0].length,
        });
    }

    return ranges;
}

/**
 * Builds replacement decorations only for the currently visible editor ranges.
 */
export function buildVisibleInlineImageDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];

    for (const visibleRange of view.visibleRanges) {
        const text = view.state.doc.sliceString(visibleRange.from, visibleRange.to);
        const matches = findInlineImageDataUrlRanges(text, visibleRange.from);

        for (const match of matches) {
            decorations.push(Decoration.replace({
                widget: new InlineImageDataUrlWidget(),
                inclusive: true,
            }).range(match.from, match.to));
        }
    }

    return Decoration.set(decorations, true);
}

/**
 * Renders a compact placeholder instead of a full inline image data URL.
 */
class InlineImageDataUrlWidget extends WidgetType {
    /**
     * Creates the compact inline replacement widget used in the editor.
     */
    constructor() {
        super();
    }

    /**
     * Builds the DOM element that visually replaces the inline data URL text.
     */
    toDOM(): HTMLElement {
        const span = document.createElement("span");
        span.textContent = "...";
        return span;
    }
}

/**
 * Recomputes inline-image decorations only when document content or visible ranges change.
 */
class InlineImageDecorationPlugin {
    decorations: DecorationSet;

    /**
     * Creates the initial decoration set for the active editor viewport.
     */
    constructor(view: EditorView) {
        this.decorations = buildVisibleInlineImageDecorations(view);
    }

    /**
     * Refreshes decorations when edits or viewport changes affect visible inline data URLs.
     */
    update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = buildVisibleInlineImageDecorations(update.view);
        }
    }
}

/**
 * Registers the viewport-scoped decoration plugin that hides verbose inline image data URLs.
 */
export const linkDecorations = ViewPlugin.fromClass(InlineImageDecorationPlugin, {
    decorations: (plugin) => plugin.decorations,
});