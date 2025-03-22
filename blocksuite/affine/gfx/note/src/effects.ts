import { EdgelessNoteMenu } from './toolbar/note-menu';
import { EdgelessNoteSeniorButton } from './toolbar/note-senior-button';
import { EdgelessNoteToolButton } from './toolbar/note-tool-button';

export function effects() {
  customElements.define('edgeless-note-tool-button', EdgelessNoteToolButton);
  customElements.define('edgeless-note-menu', EdgelessNoteMenu);
  customElements.define(
    'edgeless-note-senior-button',
    EdgelessNoteSeniorButton
  );
}

declare global {
  interface HTMLElementTagNameMap {
    'edgeless-note-tool-button': EdgelessNoteToolButton;
    'edgeless-note-menu': EdgelessNoteMenu;
    'edgeless-note-senior-button': EdgelessNoteSeniorButton;
  }
}
