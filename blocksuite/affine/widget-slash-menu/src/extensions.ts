import { WidgetViewExtension } from '@blocksuite/block-std';
import { type Container } from '@blocksuite/global/di';
import { Extension } from '@blocksuite/store';
import { literal, unsafeStatic } from 'lit/static-html.js';

import { AFFINE_SLASH_MENU_WIDGET } from './widget';

export class SlashMenuExtension extends Extension {
  static override setup(di: Container) {
    WidgetViewExtension(
      'affine:page',
      AFFINE_SLASH_MENU_WIDGET,
      literal`${unsafeStatic(AFFINE_SLASH_MENU_WIDGET)}`
    ).setup(di);

    di.add(this);
  }
}
