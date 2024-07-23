import fs, { readFileSync } from 'fs';
import assert from 'assert';
import { Buffer } from 'buffer';
import path from 'path';
import type { Page as PlaywrightPage } from 'playwright';
import { Page } from 'puppeteer';
import { UIContext, PlaywrightParserOpt } from '@midscene/core';
import { alignCoordByTrim, base64Encoded } from '@midscene/core/image';
import { getTmpFile } from '@midscene/core/utils';
import { WebElementInfo, WebElementInfoType } from './element';

export async function parseContextFromPlaywrightPage(
  page: PlaywrightPage,
  _opt?: PlaywrightParserOpt,
): Promise<UIContext<WebElementInfo>> {
  assert(page, 'page is required');
  const file = getTmpFile('jpeg');
  await page.screenshot({ path: file, type: 'jpeg', quality: 75 });
  const screenshotBuffer = readFileSync(file);
  const screenshotBase64 = base64Encoded(file);
  const captureElementSnapshot = await getElementInfosFromPage(page);
  // align element
  const elementsInfo = await alignElements(screenshotBuffer, captureElementSnapshot, page);
  const baseContext = {
    content: elementsInfo,
    screenshotBase64,
  };
  return {
    ...baseContext,
  };
}

export async function getElementInfosFromPage(page: Page | PlaywrightPage) {
  const pathDir = findNearestPackageJson(__dirname);
  assert(pathDir, `can't find pathDir, with ${__dirname}`);
  const scriptPath = path.join(pathDir, './dist/script/htmlElement.js');
  const elementInfosScriptContent = readFileSync(scriptPath, 'utf-8');
  const extraReturnLogic = `${elementInfosScriptContent}midscene_element_inspector.extractTextWithPositionDFS()`;

  const captureElementSnapshot = await (page as any).evaluate(extraReturnLogic);
  return captureElementSnapshot;
}

async function alignElements(
  screenshotBuffer: Buffer,
  elements: WebElementInfoType[],
  page: PlaywrightPage,
): Promise<WebElementInfo[]> {
  const textsAligned: WebElementInfo[] = [];
  for (const item of elements) {
    const { rect } = item;
    const aligned = await alignCoordByTrim(screenshotBuffer, rect);
    item.rect = aligned;
    item.center = [
      Math.round(aligned.left + aligned.width / 2),
      Math.round(aligned.top + aligned.height / 2),
    ];
    textsAligned.push(
      new WebElementInfo({
        ...item,
        page,
      }),
    );
  }
  return textsAligned;
}

/**
 * Find the nearest package.json file recursively
 * @param {string} dir - Home directory
 * @returns {string|null} - The most recent package.json file path or null
 */
function findNearestPackageJson(dir: string) {
  const packageJsonPath = path.join(dir, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    return dir;
  }

  const parentDir = path.dirname(dir);

  // Return null if the root directory has been reached
  if (parentDir === dir) {
    return null;
  }

  return findNearestPackageJson(parentDir);
}
