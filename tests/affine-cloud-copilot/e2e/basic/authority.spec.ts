import { expect } from '@playwright/test';

import { test } from '../base/base-test';

test.describe('AIBasic/Authority', () => {
  test.beforeEach(async ({ page, utils }) => {
    await utils.testUtils.setupTestEnvironment(page, false);
    await utils.chatPanel.openChatPanel(page);
  });

  test('should show error & login button when no login', async ({
    page,
    utils,
  }) => {
    await utils.chatPanel.makeChat(page, 'Hello');

    await expect(page.getByTestId('ai-error')).toBeVisible();
    await expect(page.getByTestId('ai-error-action-button')).toBeVisible();
  });

  test('should support login in error state', async ({ page, utils }) => {
    await utils.chatPanel.makeChat(page, 'Hello');
    const loginButton = page.getByTestId('ai-error-action-button');
    await loginButton.click();

    await expect(page.getByTestId('auth-modal')).toBeVisible();
  });
});
