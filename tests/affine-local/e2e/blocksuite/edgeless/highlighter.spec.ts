import { test } from '@affine-test/kit/playwright';
import {
  clickEdgelessModeButton,
  clickView,
  dragView,
  locateEditorContainer,
  locateToolbar,
  setEdgelessTool,
} from '@affine-test/kit/utils/editor';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import { expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  await clickEdgelessModeButton(page);
  const container = locateEditorContainer(page);
  await container.click();
});

test('should add highlighter', async ({ page }) => {
  await setEdgelessTool(page, 'highlighter');
  await dragView(page, [100, 300], [200, 400]);

  await setEdgelessTool(page, 'default');
  await clickView(page, [150, 350]);

  const toolbar = locateToolbar(page);

  await page.waitForTimeout(250);

  await expect(toolbar).toBeVisible();

  const lineWidthButton = toolbar
    .locator('.line-width-button[data-selected]')
    .last();
  const defaultLineWidth = await lineWidthButton.getAttribute('aria-label');

  expect(defaultLineWidth).toBe('22');
});
