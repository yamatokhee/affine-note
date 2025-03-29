import { loginUser } from '@affine-test/kit/utils/cloud';
import { expect } from '@playwright/test';

import { test } from '../base/base-test';

test.describe('AIBasic/Chat', () => {
  test.beforeEach(async ({ page, utils }) => {
    const user = await utils.testUtils.getUser();
    await loginUser(page, user);
    await utils.testUtils.setupTestEnvironment(page);
    await utils.chatPanel.openChatPanel(page);
  });

  test('should display empty state when no messages', async ({ page }) => {
    // Verify empty state UI
    await expect(page.getByTestId('chat-panel-empty-state')).toBeVisible();
    await expect(page.getByTestId('ai-onboarding')).toBeVisible();
  });

  test(`should send message and receive AI response:
        - send message
        - AI is loading
        - AI generating
        - AI success
    `, async ({ page, utils }) => {
    // Type and send a message
    await utils.chatPanel.makeChat(page, 'Introduce AFFiNE to me');

    // AI is loading
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Introduce AFFiNE to me',
      },
      {
        role: 'assistant',
        status: 'loading',
      },
    ]);

    await expect(page.getByTestId('ai-loading')).toBeVisible();

    // AI Generating
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Introduce AFFiNE to me',
      },
      {
        role: 'assistant',
        status: 'transmitting',
      },
    ]);

    await expect(page.getByTestId('ai-loading')).not.toBeVisible();

    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Introduce AFFiNE to me',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);
  });

  test('should support stop generating', async ({ page, utils }) => {
    await utils.chatPanel.makeChat(page, 'Introduce AFFiNE to me');

    // AI Generating
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Introduce AFFiNE to me',
      },
      {
        role: 'assistant',
        status: 'transmitting',
      },
    ]);

    await page.getByTestId('chat-panel-stop').click();
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Introduce AFFiNE to me',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);
  });

  test('should render ai actions inline if the answer is the last one in the list, otherwise, nest them under the "More" menu', async ({
    page,
    utils,
  }) => {
    await utils.chatPanel.makeChat(page, 'Hello, how can you help me?');
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Hello, how can you help me?',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);

    expect(page.getByTestId('chat-action-list')).toBeVisible();
    await utils.chatPanel.makeChat(page, 'Nice to meet you');
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Hello, how can you help me?',
      },
      {
        role: 'assistant',
        status: 'idle',
      },
      {
        role: 'user',
        content: 'Nice to meet you',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);

    const firstAnswer = await page
      .getByTestId('chat-message-assistant')
      .first();
    const more = firstAnswer.getByTestId('action-more-button');
    await more.click();
    await expect(firstAnswer.getByTestId('chat-actions')).toBeVisible();
  });

  test('should show scroll indicator when there are many messages', async ({
    page,
    utils,
  }) => {
    // Set window height to 100px to ensure scroll indicator appears
    await page.setViewportSize({ width: 1280, height: 400 });

    // Type and send a message
    await utils.chatPanel.makeChat(
      page,
      'Hello, write a poem about the moon with 50 words.'
    );

    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Hello, write a poem about the moon with 50 words.',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);

    // Wait for the answer to be completely rendered
    await page.waitForTimeout(1000);

    // Scroll up to trigger scroll indicator
    const chatMessagesContainer = page.getByTestId(
      'chat-panel-messages-container'
    );
    await chatMessagesContainer.evaluate(el => {
      el.scrollTop = 0;
    });

    const scrollDownIndicator = page.getByTestId(
      'chat-panel-scroll-down-indicator'
    );

    // Verify scroll indicator appears
    await expect(scrollDownIndicator).toBeVisible();

    // Click scroll indicator to scroll to bottom
    await scrollDownIndicator.click();

    // Verify scroll indicator disappears
    await expect(scrollDownIndicator).not.toBeVisible();
  });

  test('should show error when request failed', async ({ page, utils }) => {
    // Simulate network error by disconnecting
    await page.route('**/graphql', route => route.abort('failed'));

    // Send a message that will fail
    await utils.chatPanel.makeChat(page, 'Hello');

    await expect(page.getByTestId('ai-error')).toBeVisible();
    await expect(page.getByTestId('action-retry-button')).toBeVisible();
  });

  test('should support retrying failed messages', async ({ page, utils }) => {
    // Simulate network error by disconnecting
    await page.route('**/graphql', route => route.abort('failed'));

    // Send a message that will fail
    await utils.chatPanel.makeChat(page, 'Hello');

    // Verify error state
    await expect(page.getByTestId('ai-error')).toBeVisible();

    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Hello',
      },
      {
        role: 'assistant',
        status: 'error',
      },
    ]);

    // Reconnect network
    await page.route('**/graphql', route => route.continue());

    await page.getByTestId('action-retry-button').click();

    // Verify message is resent and AI responds
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Hello',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);
  });

  test('should support retrying question', async ({ page, utils }) => {
    await utils.chatPanel.makeChat(
      page,
      'Introduce Large Language Model in under 500 words'
    );

    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Introduce Large Language Model in under 500 words',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);

    const { actions } = await utils.chatPanel.getLatestAssistantMessage(page);
    await page.pause();
    await actions.retry();

    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Introduce Large Language Model in under 500 words',
      },
      {
        role: 'assistant',
        status: 'transmitting',
      },
    ]);

    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Introduce Large Language Model in under 500 words',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);
  });

  test('should support sending message with button', async ({
    page,
    utils,
  }) => {
    await utils.chatPanel.openChatPanel(page);
    await utils.chatPanel.typeChat(page, 'Hello');
    await page.getByTestId('chat-panel-send').click();
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Hello',
      },
      {
        role: 'assistant',
        status: 'loading',
      },
    ]);
  });

  test('should support clearing chat', async ({ page, utils }) => {
    await utils.chatPanel.openChatPanel(page);
    await utils.chatPanel.makeChat(page, 'Hello');
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Hello',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);
    await utils.chatPanel.clearChat(page);
    await utils.chatPanel.waitForHistory(page, []);
  });

  test('should support copying answer', async ({ page, utils }) => {
    await utils.chatPanel.openChatPanel(page);
    await utils.chatPanel.makeChat(page, 'Hello');
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'user',
        content: 'Hello',
      },
      {
        role: 'assistant',
        status: 'success',
      },
    ]);

    const { actions } = await utils.chatPanel.getLatestAssistantMessage(page);
    await actions.copy();
    await page.getByText('Copied to clipboard').isVisible();
    await expect(async () => {
      const { content } = await utils.chatPanel.getLatestAssistantMessage(page);
      const clipboardText = await page.evaluate(() =>
        navigator.clipboard.readText()
      );
      expect(clipboardText).toBe(content);
    }).toPass({ timeout: 5000 });
  });
});
