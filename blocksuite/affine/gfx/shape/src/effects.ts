import { EdgelessShapeMenu, EdgelessShapeToolElement } from './draggable';
import { EdgelessShapeTextEditor } from './text/edgeless-shape-text-editor';

export function effects() {
  customElements.define('edgeless-shape-text-editor', EdgelessShapeTextEditor);
  customElements.define('edgeless-shape-menu', EdgelessShapeMenu);
  customElements.define(
    'edgeless-shape-tool-element',
    EdgelessShapeToolElement
  );
}

declare global {
  interface HTMLElementTagNameMap {
    'edgeless-shape-text-editor': EdgelessShapeTextEditor;
    'edgeless-shape-menu': EdgelessShapeMenu;
    'edgeless-shape-tool-element': EdgelessShapeToolElement;
  }
}
