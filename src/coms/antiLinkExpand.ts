import {EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType} from "@codemirror/view";
import {Range} from "@codemirror/state";

class ImageWidget extends WidgetType {
    constructor(private readonly imageName: string) {
        super();
    }

    toDOM() {
        const span = document.createElement("span");
        span.textContent = `...`;
        return span;
    }
}

// Create the view plugin that will manage decorations
export const linkDecorations = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    buildDecorations(view: EditorView) {
        const decorations: Range<Decoration>[] = [];
        const text = view.state.doc.toString(); // Get the entire document content

        // Capture the entire data URL part
        const regex = /data:image\/[^;]+;base64,[^)]+/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            
            decorations.push(Decoration.replace({
                widget: new ImageWidget(match[0]),
                inclusive: true
            }).range(start, end));
        }

        return Decoration.set(decorations, true);
    }
}, {
    decorations: v => v.decorations
});

