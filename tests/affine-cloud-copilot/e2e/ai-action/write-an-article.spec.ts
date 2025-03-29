import { loginUser } from '@affine-test/kit/utils/cloud';
import { expect } from '@playwright/test';

import { test } from '../base/base-test';

test.describe('AIAction/WriteAnArticleAboutThis', () => {
  test.beforeEach(async ({ page, utils }) => {
    const user = await utils.testUtils.getUser();
    await loginUser(page, user);
    await utils.testUtils.setupTestEnvironment(page);
    await utils.chatPanel.openChatPanel(page);
  });

  test('should generate an article for the selected content', async ({
    page,
    utils,
  }) => {
    const { writeArticle } = await utils.editor.askAIWithText(
      page,
      'AFFiNE is a workspace with fully merged docs'
    );
    const { answer, responses } = await writeArticle();
    await expect(answer).toHaveText(/AFFiNE/);
    expect(responses).toEqual(new Set(['insert-below', 'replace-selection']));
  });

  test('should support writing an article for the selected text block in edgeless', async ({
    page,
    utils,
  }) => {
    const { writeArticle } = await utils.editor.askAIWithEdgeless(
      page,
      async () => {
        await utils.editor.createEdgelessText(
          page,
          'AFFiNE is a workspace with fully merged docs'
        );
      }
    );
    const { answer, responses } = await writeArticle();
    await expect(answer).toHaveText(/AFFiNE/);
    expect(responses).toEqual(new Set(['insert-below']));
  });

  test('should support writing an article for the selected note block in edgeless', async ({
    page,
    utils,
  }) => {
    const { writeArticle } = await utils.editor.askAIWithEdgeless(
      page,
      async () => {
        await utils.editor.createEdgelessNote(
          page,
          'AFFiNE is a workspace with fully merged docs'
        );
      }
    );
    const { answer, responses } = await writeArticle();
    await expect(answer).toHaveText(/AFFiNE/);
    expect(responses).toEqual(new Set(['insert-below']));
  });

  test('should show chat history in chat panel', async ({ page, utils }) => {
    const { writeArticle } = await utils.editor.askAIWithText(
      page,
      'AFFiNE is a workspace with fully merged docs'
    );
    const { answer } = await writeArticle();
    await expect(answer).toHaveText(/AFFiNE/);
    const replace = answer.getByTestId('answer-replace');
    await replace.click();
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'action',
      },
    ]);
    const {
      answer: panelAnswer,
      prompt,
      actionName,
    } = await utils.chatPanel.getLatestAIActionMessage(page);
    await expect(panelAnswer).toHaveText(/AFFiNE/);
    await expect(prompt).toHaveText(/Write an article about this/);
    await expect(actionName).toHaveText(/Write an article about this/);
  });
});
