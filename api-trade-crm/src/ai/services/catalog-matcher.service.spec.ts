import { describe, expect, it, jest } from '@jest/globals';
import type Anthropic from '@anthropic-ai/sdk';
import {
  CATALOG_SEARCH_TOOL,
  CatalogMatcherService,
  extractJsonObject,
  normalizeQuantity,
  parseCatalogMatchResult,
} from './catalog-matcher.service';
import type {
  CatalogToolItem,
  CatalogToolService,
} from './catalog-tool.service';
import type { AnthropicClient } from '../anthropic.client';
import { AI_MAX_TOOL_ITERATIONS } from '../ai-estimator.config';

const leaf: CatalogToolItem = {
  id: 'cat-leaf',
  type: 'SERVICE',
  description: 'Leaf removal and disposal',
  unitPrice: 75,
};
const mulch: CatalogToolItem = {
  id: 'cat-mulch',
  type: 'MATERIAL',
  description: 'Garden soil and mulch',
  unitPrice: 12,
};

function allowed(...items: CatalogToolItem[]): Map<string, CatalogToolItem> {
  return new Map(items.map((item) => [item.id, item]));
}

/** A minimal fake Messages API response. */
function message(
  content: unknown[],
  stopReason = 'end_turn',
): Anthropic.Message {
  return { content, stop_reason: stopReason } as unknown as Anthropic.Message;
}

function textMessage(text: string): Anthropic.Message {
  return message([{ type: 'text', text }]);
}

describe('extractJsonObject', () => {
  it('reads a bare JSON object', () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it('unwraps a fenced code block and surrounding prose', () => {
    expect(
      extractJsonObject('Here you go:\n```json\n{"a":1}\n```\nDone.'),
    ).toEqual({ a: 1 });
  });

  it('throws when there is no object to parse', () => {
    expect(() => extractJsonObject('no json here')).toThrow();
  });
});

describe('normalizeQuantity', () => {
  it.each([
    [3, 3],
    ['2', 2],
    [0, 1],
    [-4, 1],
    [Number.NaN, 1],
    [Number.POSITIVE_INFINITY, 1],
    [1.239, 1.24],
  ])('maps %p to %p', (input, expected) => {
    expect(normalizeQuantity(input)).toBe(expected);
  });

  it('caps an absurd quantity', () => {
    expect(normalizeQuantity(100000)).toBe(999);
  });
});

describe('parseCatalogMatchResult', () => {
  it('keeps a suggestion whose id was returned by the tool and takes the catalog values', () => {
    const result = parseCatalogMatchResult(
      JSON.stringify({
        suggestions: [
          {
            catalogItemId: 'cat-leaf',
            quantity: 2,
            // The model must not be able to author these — they are ignored.
            description: 'Totally different name',
            unitPrice: 9999,
            type: 'FEE',
          },
        ],
      }),
      allowed(leaf),
    );

    expect(result.suggestions).toEqual([
      {
        catalogItemId: 'cat-leaf',
        type: 'SERVICE',
        description: 'Leaf removal and disposal',
        unitPrice: 75,
        quantity: 2,
        matchReason: undefined,
      },
    ]);
  });

  it('keeps only ids the tool returned, dropping an invented or foreign one', () => {
    const result = parseCatalogMatchResult(
      JSON.stringify({
        suggestions: [
          { catalogItemId: 'made-up-id', quantity: 1 },
          // Real id, but never returned by this request's tool call.
          { catalogItemId: mulch.id, quantity: 1 },
          { catalogItemId: leaf.id, quantity: 1 },
        ],
      }),
      allowed(leaf),
    );

    expect(result.suggestions.map((s) => s.catalogItemId)).toEqual([
      'cat-leaf',
    ]);
  });

  it('drops duplicate ids', () => {
    const result = parseCatalogMatchResult(
      JSON.stringify({
        suggestions: [
          { catalogItemId: 'cat-leaf', quantity: 1 },
          { catalogItemId: 'cat-leaf', quantity: 5 },
        ],
      }),
      allowed(leaf),
    );

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].quantity).toBe(1);
  });

  it('defaults a missing quantity to 1', () => {
    const result = parseCatalogMatchResult(
      JSON.stringify({ suggestions: [{ catalogItemId: 'cat-leaf' }] }),
      allowed(leaf),
    );

    expect(result.suggestions[0].quantity).toBe(1);
  });

  it('returns a friendly message on malformed output', () => {
    const result = parseCatalogMatchResult('I could not do that.', allowed());

    expect(result.suggestions).toEqual([]);
    expect(result.message).toContain('could not produce usable suggestions');
  });

  it('returns an empty suggestion list when the catalog matched nothing', () => {
    const result = parseCatalogMatchResult(
      JSON.stringify({
        suggestions: [],
        message: 'No catalog item matches — add one manually.',
      }),
      allowed(),
    );

    expect(result.suggestions).toEqual([]);
    expect(result.message).toContain('add one manually');
  });
});

describe('CATALOG_SEARCH_TOOL', () => {
  it('exposes only a short free-text query and never a write', () => {
    expect(CATALOG_SEARCH_TOOL.name).toBe('search_catalog');
    expect(CATALOG_SEARCH_TOOL.input_schema.required).toEqual(['query']);
    expect(
      Object.keys(CATALOG_SEARCH_TOOL.input_schema.properties ?? {}),
    ).toEqual(['query']);
  });
});

function createMatcher(
  createMessage: jest.Mock<
    (
      params: Anthropic.MessageCreateParamsNonStreaming,
    ) => Promise<Anthropic.Message>
  >,
  search: jest.Mock<
    (tenantId: string, query: string) => Promise<CatalogToolItem[]>
  >,
) {
  const anthropic = {
    createMessage,
    configured: true,
    modelId: 'claude-haiku-5-5',
  } as unknown as AnthropicClient;
  const catalogTool = { search } as unknown as CatalogToolService;

  return new CatalogMatcherService(anthropic, catalogTool);
}

const toolUseMessage = () =>
  message(
    [
      {
        type: 'tool_use',
        id: 'tool-1',
        name: 'search_catalog',
        input: { query: 'leaf' },
      },
    ],
    'tool_use',
  );

describe('CatalogMatcherService loop', () => {
  it('executes the tenant-scoped search, feeds it back, and returns real items', async () => {
    const createMessage = jest
      .fn<
        (
          params: Anthropic.MessageCreateParamsNonStreaming,
        ) => Promise<Anthropic.Message>
      >()
      .mockResolvedValueOnce(toolUseMessage())
      .mockResolvedValueOnce(
        textMessage(
          JSON.stringify({
            suggestions: [
              {
                catalogItemId: 'cat-leaf',
                quantity: 1,
                matchReason: 'matches',
              },
            ],
          }),
        ),
      );
    const search = jest
      .fn<(tenantId: string, query: string) => Promise<CatalogToolItem[]>>()
      .mockResolvedValue([leaf]);

    const matcher = createMatcher(createMessage, search);
    const result = await matcher.match('tenant-1', 'clear the leaves');

    expect(search).toHaveBeenCalledWith('tenant-1', 'leaf');
    expect(createMessage).toHaveBeenCalledTimes(2);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({
      catalogItemId: 'cat-leaf',
      description: 'Leaf removal and disposal',
    });

    // The second call must carry the tool_result so the model can ground itself.
    const secondCall = createMessage.mock.calls[1][0];
    expect(JSON.stringify(secondCall.messages)).toContain('tool_result');
    expect(JSON.stringify(secondCall.messages)).toContain('cat-leaf');
  });

  it('reports an unknown tool as an error result instead of failing', async () => {
    const createMessage = jest
      .fn<
        (
          params: Anthropic.MessageCreateParamsNonStreaming,
        ) => Promise<Anthropic.Message>
      >()
      .mockResolvedValueOnce(
        message(
          [{ type: 'tool_use', id: 't9', name: 'run_sql', input: {} }],
          'tool_use',
        ),
      )
      .mockResolvedValueOnce(textMessage('{"suggestions":[]}'));
    const search =
      jest.fn<
        (tenantId: string, query: string) => Promise<CatalogToolItem[]>
      >();

    const matcher = createMatcher(createMessage, search);
    const result = await matcher.match('tenant-1', 'anything');

    expect(search).not.toHaveBeenCalled();
    expect(result.suggestions).toEqual([]);
    const followUp = createMessage.mock.calls[1][0].messages.at(-1);
    expect(JSON.stringify(followUp)).toContain('"is_error":true');
  });

  it('stops after the hard tool-iteration cap', async () => {
    const createMessage = jest
      .fn<
        (
          params: Anthropic.MessageCreateParamsNonStreaming,
        ) => Promise<Anthropic.Message>
      >()
      .mockResolvedValue(toolUseMessage());
    const search = jest
      .fn<(tenantId: string, query: string) => Promise<CatalogToolItem[]>>()
      .mockResolvedValue([leaf]);

    const matcher = createMatcher(createMessage, search);
    const result = await matcher.match('tenant-1', 'loop forever');

    expect(createMessage).toHaveBeenCalledTimes(AI_MAX_TOOL_ITERATIONS);
    expect(result.suggestions).toEqual([]);
  });

  it('propagates a provider error so the caller can map it', async () => {
    const createMessage = jest
      .fn<
        (
          params: Anthropic.MessageCreateParamsNonStreaming,
        ) => Promise<Anthropic.Message>
      >()
      .mockRejectedValue(new Error('Request timed out'));

    const matcher = createMatcher(createMessage, jest.fn());

    await expect(matcher.match('tenant-1', 'anything')).rejects.toThrow(
      'Request timed out',
    );
  });
});
