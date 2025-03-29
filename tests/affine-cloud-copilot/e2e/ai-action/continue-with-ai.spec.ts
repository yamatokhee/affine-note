import { loginUser } from '@affine-test/kit/utils/cloud';
import { expect } from '@playwright/test';

import { test } from '../base/base-test';

test.describe('AIAction/ContinueWithAI', () => {
  test.beforeEach(async ({ page, utils }) => {
    const user = await utils.testUtils.getUser();
    await loginUser(page, user);
    await utils.testUtils.setupTestEnvironment(page);
  });

  test('should support continue in chat panel', async ({ page, utils }) => {
    const { continueWithAi } = await utils.editor.askAIWithText(page, 'Apple');
    await continueWithAi();
    const chatPanelInput = await page.getByTestId('chat-panel-input-container');
    const quote = await chatPanelInput.getByTestId('chat-selection-quote');
    await expect(quote).toHaveText(/Apple/, { timeout: 10000 });
  });
});
