import { loginUser } from '@affine-test/kit/utils/cloud';
import { expect } from '@playwright/test';

import { test } from '../base/base-test';

test.describe('AIAction/BrainstormIdeasWithMindMap', () => {
  test.beforeEach(async ({ page, utils }) => {
    const user = await utils.testUtils.getUser();
    await loginUser(page, user);
    await utils.testUtils.setupTestEnvironment(page);
    await utils.chatPanel.openChatPanel(page);
  });

  test('should generate a mind map for the selected content', async ({
    page,
    utils,
  }) => {
    const { brainstormMindMap } = await utils.editor.askAIWithText(
      page,
      'Panda'
    );
    const { answer, responses } = await brainstormMindMap();
    await expect(answer.locator('mini-mindmap-preview')).toBeVisible();
    expect(responses).toEqual(new Set(['insert-below']));
  });

  test('should generate a mind map for the selected text block in edgeless', async ({
    page,
    utils,
  }) => {
    const { brainstormMindMap } = await utils.editor.askAIWithEdgeless(
      page,
      async () => {
        await utils.editor.createEdgelessText(page, 'Panda');
      }
    );
    const { answer, responses } = await brainstormMindMap();
    await expect(answer.locator('mini-mindmap-preview')).toBeVisible();
    expect(responses).toEqual(new Set(['insert-below']));
  });

  test('should generate a mind map for the selected note block in edgeless', async ({
    page,
    utils,
  }) => {
    const { brainstormMindMap } = await utils.editor.askAIWithEdgeless(
      page,
      async () => {
        await utils.editor.createEdgelessNote(page, 'Panda');
      }
    );
    const { answer, responses } = await brainstormMindMap();
    await expect(answer.locator('mini-mindmap-preview')).toBeVisible();
    expect(responses).toEqual(new Set(['insert-below']));
  });
});
