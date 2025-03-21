import { EdgelessFrameMenu, EdgelessFrameToolButton } from './edgeless-toolbar';
import { FrameBlockComponent } from './frame-block';

export function effects() {
  customElements.define('affine-frame', FrameBlockComponent);
  customElements.define('edgeless-frame-tool-button', EdgelessFrameToolButton);
  customElements.define('edgeless-frame-menu', EdgelessFrameMenu);
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-frame': FrameBlockComponent;
    'edgeless-frame-tool-button': EdgelessFrameToolButton;
    'edgeless-frame-menu': EdgelessFrameMenu;
  }
}
