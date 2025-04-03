import { loginUser } from '@affine-test/kit/utils/cloud';
import { expect } from '@playwright/test';

import { test } from '../base/base-test';

test.describe('AIChatWith/Collections', () => {
  test.beforeEach(async ({ page, utils }) => {
    const user = await utils.testUtils.getUser();
    await loginUser(page, user);
    await utils.testUtils.setupTestEnvironment(page);
    await utils.chatPanel.openChatPanel(page);

    // Create two collections
    await utils.editor.createCollectionAndDoc(
      page,
      'Collection 1',
      'EEee is a cute cat'
    );
    await utils.editor.createCollectionAndDoc(
      page,
      'Collection 2',
      'FFff is a cute dog'
    );
  });

  test('should support chat with collection', async ({ page, utils }) => {
    await utils.chatPanel.chatWithCollections(page, ['Collection 1']);
    await utils.chatPanel.makeChat(page, 'What is EEee(Use English)');
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'What is EEee(Use English)',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);

    await expect(async () => {
      const { content, message } =
        await utils.chatPanel.getLatestAssistantMessage(page);
      expect(content).toMatch(/EEee.*cat/);
      expect(await message.locator('affine-footnote-node').count()).toBe(1);
    }).toPass();
  });

  test('should support chat with multiple collections', async ({
    page,
    utils,
  }) => {
    await utils.chatPanel.chatWithCollections(page, [
      'Collection 1',
      'Collection 2',
    ]);
    await utils.chatPanel.makeChat(
      page,
      'What is EEee? What is FFff?(Use English)'
    );
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'What is EEee? What is FFff?(Use English)',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);

    await expect(async () => {
      const { content, message } =
        await utils.chatPanel.getLatestAssistantMessage(page);
      expect(content).toMatch(/EEee.*cat/);
      expect(content).toMatch(/FFff.*dog/);
      expect(await message.locator('affine-footnote-node').count()).toBe(2);
    }).toPass();
  });
});
