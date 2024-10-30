import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { callToGetJSONObject } from '@/ai-model';
import { AIActionType } from '@/ai-model/common';
import { afterAll, describe, expect, it } from 'vitest';
import { type InspectAiTestCase, getPageTestData } from './test-suite/util';

const testSources = [
  'todo',
  'online_order',
  'online_order_list',
  // 'taobao',
  'aweme_login',
  'aweme_play',
];
const allResults: Array<{
  name: string;
  successRate: string;
  successCount: number;
  totalCount: number;
}> = [];
describe(
  'automation - computer',
  () => {
    afterAll(() => {
      console.table(allResults);
    });
    it('basic run', async () => {
      for (const source of testSources) {
        const result: Array<{
          expectation: any;
          reality: string;
          rectInBox: boolean;
        }> = [];
        const aiDataPath = path.join(
          __dirname,
          `ai-data/inspect/${source}.json`,
        );
        const aiData = JSON.parse(
          readFileSync(aiDataPath, 'utf-8'),
        ) as InspectAiTestCase;
        const res = aiData.testCases.map(async (testCase) => {
          const { context } = await getPageTestData(
            path.join(__dirname, aiData.testDataPath),
          );
          const res = await callToGetJSONObject<{ x: number; y: number }>(
            [
              {
                role: 'system',
                content: `<SYSTEM_CAPABILITY>
                    * 根据截图和描述，找到特定的坐标位置
                    </SYSTEM_CAPABILITY>
            `,
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'image_url',
                    image_url: {
                      url: context.originalScreenshotBase64,
                    },
                  },
                  {
                    type: 'text',
                    text: `
            pageDescription: ${context.size} \n
        
            Here is the item user want to find. Just go ahead:
            =====================================
            找到${testCase.prompt}位置，x/y坐标，并按照下面的格式返回：

            {
              "x": number, // 横向坐标位置
              "y": number // 纵向坐标位置
            }
            =====================================
            `,
                  },
                ],
              },
            ],
            AIActionType.ASSERT,
          );
          const rect: any = context.content.find(
            (item: any) => testCase.response[0].indexId === item.indexId,
          ).rect;
          result.push({
            expectation: {
              prompt: testCase.prompt,
              rect,
            },
            reality: JSON.stringify(res),
            rectInBox:
              res &&
              typeof res === 'object' &&
              'x' in res &&
              'y' in res &&
              res.x >= rect.left &&
              res.x <= rect.left + rect.width &&
              res.y >= rect.top &&
              res.y <= rect.top + rect.height,
          });
        });
        await Promise.all(res);
        // Write result to file
        const resultFilePath = path.join(
          __dirname,
          '__ai_responses__',
          'computer',
          `${source}-computer-result.json`,
        );
        const resultDir = path.dirname(resultFilePath);

        if (!existsSync(resultDir)) {
          mkdirSync(resultDir, { recursive: true });
        }

        writeFileSync(resultFilePath, JSON.stringify(result, null, 2), 'utf-8');

        const totalCount = result.length;
        const successCount = result.filter((r) => r.rectInBox).length;
        const successRate = ((successCount / totalCount) * 100).toFixed(2);
        allResults.push({
          name: source,
          successRate: `${successRate}%`,
          successCount,
          totalCount,
        });
      }
    });
  },
  {
    timeout: 100000,
  },
);
