const { preparePayloadForResponse, truncatePayload, MAX_PAYLOAD_BYTES } = require('../src/scraper/limitPayload');

describe('limitPayload', () => {
  const noopLogger = { warn: jest.fn() };

  test('preparePayloadForResponse returns payload unchanged when under limit', () => {
    const p = {
      success: true,
      jobId: 'x',
      data: [{ markdown: 'small', metadata: {}, contacts: {} }],
      blocked: [],
    };
    const out = preparePayloadForResponse(p, noopLogger);
    expect(out).toEqual(p);
    expect(out.truncated).toBeUndefined();
  });

  test('truncatePayload marks truncated and shortens markdown', () => {
    const longMd = 'x'.repeat(10000);
    const p = {
      success: true,
      jobId: 'x',
      data: [{ markdown: longMd, metadata: {}, contacts: {} }],
      blocked: [],
    };
    const out = truncatePayload(p);
    expect(out.truncated).toBe(true);
    expect(out.data[0].markdown.length).toBeLessThan(longMd.length);
    expect(out.data[0].markdown).toMatch(/\[Content truncated\]/);
  });

  test('preparePayloadForResponse truncates when over byte limit', () => {
    const huge = 'y'.repeat(MAX_PAYLOAD_BYTES);
    const p = {
      success: true,
      jobId: 'id',
      data: [{ markdown: huge, metadata: {}, contacts: {} }],
      blocked: [],
    };
    const out = preparePayloadForResponse(p, noopLogger);
    expect(Buffer.byteLength(JSON.stringify(out))).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES);
    expect(noopLogger.warn).toHaveBeenCalled();
  });
});
