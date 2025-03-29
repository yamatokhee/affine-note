import { loginUser } from '@affine-test/kit/utils/cloud';
import { expect } from '@playwright/test';

import { test } from '../base/base-test';

test.describe('AIAction/MakeItReal', () => {
  test.beforeEach(async ({ page, utils }) => {
    const user = await utils.testUtils.getUser();
    await loginUser(page, user);
    await utils.testUtils.setupTestEnvironment(page);
    await utils.chatPanel.openChatPanel(page);
  });

  test('should support making the selected content to real', async ({
    page,
    utils,
  }) => {
    const { makeItReal } = await utils.editor.askAIWithText(
      page,
      'AFFiNE is a workspace with fully merged docs'
    );
    const { answer, responses } = await makeItReal();
    await expect(answer.locator('iframe')).toBeVisible({ timeout: 30000 });
    expect(responses).toEqual(new Set(['insert-below']));
  });

  test('should support making the selected text block to real in edgeless', async ({
    page,
    utils,
  }) => {
    const { makeItReal } = await utils.editor.askAIWithEdgeless(
      page,
      async () => {
        await utils.editor.createEdgelessText(
          page,
          'AFFiNE is a workspace with fully merged docs'
        );
      }
    );
    const { answer, responses } = await makeItReal();
    await expect(answer.locator('iframe')).toBeVisible({ timeout: 30000 });
    expect(responses).toEqual(new Set(['insert-below']));
  });

  test('should support making the selected note block to real in edgeless', async ({
    page,
    utils,
  }) => {
    const { makeItReal } = await utils.editor.askAIWithEdgeless(
      page,
      async () => {
        await utils.editor.createEdgelessNote(
          page,
          'AFFiNE is a workspace with fully merged docs'
        );
      }
    );
    const { answer, responses } = await makeItReal();
    await expect(answer.locator('iframe')).toBeVisible({ timeout: 30000 });
    expect(responses).toEqual(new Set(['insert-below']));
  });

  test('should show chat history in chat panel', async ({ page, utils }) => {
    const { makeItReal } = await utils.editor.askAIWithText(
      page,
      'AFFiNE is a workspace with fully merged docs'
    );
    const { answer } = await makeItReal();
    const insert = answer.getByTestId('answer-insert-below');
    await insert.click();
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
    await expect(panelAnswer.locator('affine-code')).toBeVisible();
    await expect(prompt).toHaveText(/Write a web page of follow text/);
    await expect(actionName).toHaveText(/Make it real with text/);
  });
});
