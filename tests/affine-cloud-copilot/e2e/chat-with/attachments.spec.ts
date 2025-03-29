import { loginUser } from '@affine-test/kit/utils/cloud';
import { expect } from '@playwright/test';

import { test } from '../base/base-test';

test.describe('AIChatWith/Attachments', () => {
  test.beforeEach(async ({ page, utils }) => {
    const user = await utils.testUtils.getUser();
    await loginUser(page, user);
    await utils.testUtils.setupTestEnvironment(page);
    await utils.chatPanel.openChatPanel(page);
  });

  test('support chat with attachment', async ({ page, utils }) => {
    const textContent = 'EEee is a cute cat';
    const buffer = Buffer.from(textContent);

    await utils.chatPanel.chatWithAttachments(
      page,
      [
        {
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: buffer,
        },
      ],
      'What is EEee?'
    );

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

  test('support chat with multiple attachments', async ({ page, utils }) => {
    const textContent1 = 'EEee is a cute cat';
    const textContent2 = 'FFff is a cute dog';
    const buffer1 = Buffer.from(textContent1);
    const buffer2 = Buffer.from(textContent2);

    await utils.chatPanel.chatWithAttachments(
      page,
      [
        {
          name: 'document1.txt',
          mimeType: 'text/plain',
          buffer: buffer1,
        },
        {
          name: 'document2.txt',
          mimeType: 'text/plain',
          buffer: buffer2,
        },
      ],
      'What is EEee? What is FFff?'
    );

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
      const { content, message } =
        await utils.chatPanel.getLatestAssistantMessage(page);
      expect(content).toMatch(/EEee/);
      expect(content).toMatch(/FFff/);
      expect(await message.locator('affine-footnote-node').count()).toBe(2);
    }).toPass({ timeout: 20000 });
  });
});
