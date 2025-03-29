import { loginUser } from '@affine-test/kit/utils/cloud';
import { focusDocTitle } from '@affine-test/kit/utils/editor';
import {
  clickNewPageButton,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import { expect } from '@playwright/test';

import { test } from '../base/base-test';

test.describe('AIChatWith/Doc', () => {
  test.beforeEach(async ({ page, utils }) => {
    const user = await utils.testUtils.getUser();
    await loginUser(page, user);
    await utils.testUtils.setupTestEnvironment(page);
    await utils.chatPanel.openChatPanel(page);
  });

  test('support chat with specified doc', async ({ page, utils }) => {
    // Initialize the doc
    await focusDocTitle(page);
    await page.keyboard.insertText('Test Doc');
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('EEee is a cute cat');

    await utils.chatPanel.chatWithDoc(page, 'Test Doc');

    await utils.chatPanel.makeChat(page, 'What is EEee?');
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'What is EEee?',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);

    await expect(async () => {
      const { content } = await utils.chatPanel.getLatestAssistantMessage(page);
      expect(content).toMatch(/EEee/);
    }).toPass({ timeout: 10000 });
  });

  test('support chat with specified docs', async ({ page, utils }) => {
    // Initialize the doc 1
    await focusDocTitle(page);
    await page.keyboard.insertText('Test Doc1');
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('EEee is a cute cat');

    // Initialize the doc 2
    await clickNewPageButton(page);
    await waitForEditorLoad(page);
    await focusDocTitle(page);
    await page.keyboard.insertText('Test Doc2');
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('FFff is a cute dog');

    await utils.chatPanel.chatWithDoc(page, 'Test Doc1');
    await utils.chatPanel.chatWithDoc(page, 'Test Doc2');

    await utils.chatPanel.makeChat(page, 'What is EEee? What is FFff?');
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'What is EEee? What is FFff?',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);

    await expect(async () => {
      const { content } = await utils.chatPanel.getLatestAssistantMessage(page);
      expect(content).toMatch(/EEee/);
      expect(content).toMatch(/FFff/);
    }).toPass({ timeout: 10000 });
  });
});
