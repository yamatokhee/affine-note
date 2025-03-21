import { html } from 'lit';

import { QuickToolExtension, SeniorToolExtension } from './extension/index.js';
import { buildFrameDenseMenu } from './frame/frame-dense-menu.js';
import { buildLinkDenseMenu } from './link/link-dense-menu.js';

const defaultQuickTool = QuickToolExtension('default', ({ block }) => {
  return {
    type: 'default',
    content: html`<edgeless-default-tool-button
      .edgeless=${block}
    ></edgeless-default-tool-button>`,
  };
});

const frameQuickTool = QuickToolExtension('frame', ({ block, gfx }) => {
  return {
    type: 'frame',
    content: html`<edgeless-frame-tool-button
      .edgeless=${block}
    ></edgeless-frame-tool-button>`,
    menu: buildFrameDenseMenu(block, gfx),
    enable: !block.doc.readonly,
  };
});

const connectorQuickTool = QuickToolExtension('connector', ({ block }) => {
  return {
    type: 'connector',
    content: html`<edgeless-connector-tool-button
      .edgeless=${block}
    ></edgeless-connector-tool-button>`,
  };
});

const linkQuickTool = QuickToolExtension('link', ({ block, gfx }) => {
  return {
    content: html`<edgeless-link-tool-button
      .edgeless=${block}
    ></edgeless-link-tool-button>`,
    menu: buildLinkDenseMenu(block, gfx),
  };
});

const noteSeniorTool = SeniorToolExtension('note', ({ block }) => {
  return {
    name: 'Note',
    content: html`<edgeless-note-senior-button
      .edgeless=${block}
    ></edgeless-note-senior-button>`,
  };
});

const penSeniorTool = SeniorToolExtension('pen', ({ block }) => {
  return {
    name: 'Pen',
    content: html`<div class="brush-and-eraser">
      <edgeless-brush-tool-button
        .edgeless=${block}
      ></edgeless-brush-tool-button>

      <edgeless-eraser-tool-button
        .edgeless=${block}
      ></edgeless-eraser-tool-button>
    </div> `,
  };
});

const shapeSeniorTool = SeniorToolExtension(
  'shape',
  ({ block, toolbarContainer }) => {
    return {
      name: 'Shape',
      content: html`<edgeless-shape-tool-button
        .edgeless=${block}
        .toolbarContainer=${toolbarContainer}
      ></edgeless-shape-tool-button>`,
    };
  }
);

const mindMapSeniorTool = SeniorToolExtension(
  'mindMap',
  ({ block, toolbarContainer }) => {
    return {
      name: 'Mind Map',
      content: html`<edgeless-mindmap-tool-button
        .edgeless=${block}
        .toolbarContainer=${toolbarContainer}
      ></edgeless-mindmap-tool-button>`,
    };
  }
);

const templateSeniorTool = SeniorToolExtension('template', ({ block }) => {
  return {
    name: 'Template',
    content: html`<edgeless-template-button .edgeless=${block}>
    </edgeless-template-button>`,
  };
});

export const quickTools = [
  defaultQuickTool,
  frameQuickTool,
  connectorQuickTool,
  linkQuickTool,
];

export const seniorTools = [
  noteSeniorTool,
  penSeniorTool,
  shapeSeniorTool,
  mindMapSeniorTool,
  templateSeniorTool,
];
