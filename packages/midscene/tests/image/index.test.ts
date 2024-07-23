import { alignCoordByTrim, base64Encoded, imageInfo, imageInfoOfBase64, trimImage } from '@/image';
import { getFixture } from 'tests/utils';
import { describe, it, expect } from 'vitest';

describe('image utils', () => {
  const image = getFixture('icon.png');
  it('imageInfo', async () => {
    const info = await imageInfo(image);
    expect(info).toMatchSnapshot();
  });

  it('base64Encoded', () => {
    const base64 = base64Encoded(image);
    expect(base64).toMatchSnapshot();

    const headlessBase64 = base64Encoded(image, false);
    expect(headlessBase64).toMatchSnapshot();
  });

  it('base64 + imageInfo', async () => {
    const image = getFixture('icon.png');
    const base64 = base64Encoded(image);
    const info = await imageInfoOfBase64(base64);
    expect(info).toMatchSnapshot();
  });

  it('trim image', async () => {
    const file = getFixture('long-text.png');
    const info = await trimImage(file);
    expect(info).toMatchSnapshot();

    // dark bg
    const d = await trimImage(getFixture('table.png'));
    expect(d).toMatchSnapshot();

    // colorful
    const c = await trimImage(getFixture('colorful.png'));
    expect(c).toMatchSnapshot();
  });

  it('align a sub-image', async () => {
    const file = getFixture('long-text.png');
    const rect = await alignCoordByTrim(file, { left: 140, top: 50, width: 200, height: 80 });
    expect(rect).toMatchSnapshot();
  });
});