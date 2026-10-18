import { describe, expect, it, jest } from '@jest/globals';
import type Anthropic from '@anthropic-ai/sdk';
import {
  CATALOG_SEARCH_TOOL,
  CatalogMatcherService,
  extractJsonObject,
  normalizeQuantity,
  parseCatalogMatchResult,
  SYSTEM_PROMPT,
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

/**
 * Builds the ref→item map the parser receives. Refs are assigned the same way
 * the matcher's registry does: "1", "2", … in the order items were sent.
 */
function allowed(...items: CatalogToolItem[]): Map<string, CatalogToolItem> {
  return new Map(items.map((item, index) => [String(index + 1), item]));
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
  it('maps a ref back to the real catalog row and takes its values', () => {
    const result = parseCatalogMatchResult(
      JSON.stringify({
        suggestions: [
          {
            catalogItemRef: '1',
            quantity: 2,
            // The model must not be able to author these — they are ignored.
            catalogItemId: 'not-used',
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

  it('keeps only refs that were sent, dropping invented ones', () => {
    const result = parseCatalogMatchResult(
      JSON.stringify({
        suggestions: [
          { catalogItemRef: 'made-up-ref', quantity: 1 },
          // A real UUID is not a ref — it was never sent to the model.
          { catalogItemRef: mulch.id, quantity: 1 },
          { catalogItemRef: '1', quantity: 1 },
        ],
      }),
      allowed(leaf),
    );

    expect(result.suggestions.map((s) => s.catalogItemId)).toEqual([
      'cat-leaf',
    ]);
  });

  it('drops duplicate refs', () => {
    const result = parseCatalogMatchResult(
      JSON.stringify({
        suggestions: [
          { catalogItemRef: '1', quantity: 1 },
          { catalogItemRef: '1', quantity: 5 },
        ],
      }),
      allowed(leaf),
    );

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].quantity).toBe(1);
  });

  it('defaults a missing quantity to 1', () => {
    const result = parseCatalogMatchResult(
      JSON.stringify({ suggestions: [{ catalogItemRef: '1' }] }),
      allowed(leaf),
    );

    expect(result.suggestions[0].quantity).toBe(1);
  });

  it('still accepts the legacy catalogItemId key, treating it as a ref', () => {
    const result = parseCatalogMatchResult(
      JSON.stringify({ suggestions: [{ catalogItemId: '1', quantity: 1 }] }),
      allowed(leaf),
    );

    expect(result.suggestions[0].catalogItemId).toBe('cat-leaf');
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
  it('exposes only a short keyword query and never a write', () => {
    expect(CATALOG_SEARCH_TOOL.name).toBe('search_catalog');
    expect(CATALOG_SEARCH_TOOL.input_schema.required).toEqual(['query']);
    expect(
      Object.keys(CATALOG_SEARCH_TOOL.input_schema.properties ?? {}),
    ).toEqual(['query']);
    // The model is steered toward short keyword queries.
    expect(CATALOG_SEARCH_TOOL.description).toContain('1-3');
  });
});

describe('SYSTEM_PROMPT', () => {
  it('requires a catalog search and short, distinctive keywords', () => {
    expect(SYSTEM_PROMPT).toContain('MUST call search_catalog');
    expect(SYSTEM_PROMPT).toContain('1-3 distinctive keywords');
    expect(SYSTEM_PROMPT).toContain('drop filler words');
  });

  it('documents the empty-query escape hatch and the ref contract', () => {
    expect(SYSTEM_PROMPT).toContain('empty query');
    expect(SYSTEM_PROMPT).toContain('catalogItemRef');
  });
});

type CreateMessageMock = jest.Mock<
  (
    params: Anthropic.MessageCreateParamsNonStreaming,
  ) => Promise<Anthropic.Message>
>;

function createMessageMock(): CreateMessageMock {
  return jest.fn<
    (
      params: Anthropic.MessageCreateParamsNonStreaming,
    ) => Promise<Anthropic.Message>
  >();
}

function searchMock(items: CatalogToolItem[]) {
  return jest
    .fn<(tenantId: string, query: string) => Promise<CatalogToolItem[]>>()
    .mockResolvedValue(items);
}

type SearchMock = ReturnType<typeof searchMock>;

function createMatcher(
  createMessage: CreateMessageMock,
  search: SearchMock = searchMock([]),
) {
  const anthropic = {
    createMessage,
    configured: true,
    modelId: 'claude-haiku-5-5',
  } as unknown as AnthropicClient;
  const catalogTool = { search } as unknown as CatalogToolService;

  return {
    matcher: new CatalogMatcherService(anthropic, catalogTool),
    search,
  };
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

const textSuggestions = (payload: unknown) =>
  textMessage(JSON.stringify(payload));

describe('CatalogMatcherService — tool use', () => {
  it('offers the tool, forces a catalog read first, and maps refs back', async () => {
    const createMessage = createMessageMock()
      .mockResolvedValueOnce(toolUseMessage())
      .mockResolvedValueOnce(
        textSuggestions({
          suggestions: [{ catalogItemRef: '1', quantity: 1 }],
        }),
      );
    const search = searchMock([leaf]);
    const { matcher } = createMatcher(createMessage, search);

    const result = await matcher.match('tenant-1', 'clear the leaves');

    expect(createMessage).toHaveBeenCalledTimes(2);

    const first = createMessage.mock.calls[0][0];
    expect(first.tools).toHaveLength(1);
    // Turn 1 must consult the catalog; later turns may answer directly.
    expect(first.tool_choice).toEqual({
      type: 'tool',
      name: 'search_catalog',
    });
    // The catalog is not inlined into the prompt (the messages array is mutated
    // as the loop appends tool results, so check the first user turn itself).
    expect(JSON.stringify(first.messages[0])).not.toContain(
      'Leaf removal and disposal',
    );

    const second = createMessage.mock.calls[1][0];
    expect(second.tool_choice).toBeUndefined();

    expect(search).toHaveBeenCalledWith('tenant-1', 'leaf');

    const toolResult = JSON.stringify(second.messages.at(-1));
    expect(toolResult).toContain('tool_result');
    expect(toolResult).toContain('\\"ref\\":\\"1\\"');
    expect(toolResult).not.toContain('cat-leaf');

    expect(result.suggestions[0]).toMatchObject({
      catalogItemId: 'cat-leaf',
      description: 'Leaf removal and disposal',
    });
  });

  it('can return the whole catalog in one tool result (empty query)', async () => {
    const many = Array.from({ length: 16 }, (_, index) => ({
      ...leaf,
      id: `cat-${index}`,
      description: `Item ${index}`,
    }));
    const createMessage = createMessageMock()
      .mockResolvedValueOnce(
        message(
          [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'search_catalog',
              input: { query: '' },
            },
          ],
          'tool_use',
        ),
      )
      .mockResolvedValueOnce(
        textSuggestions({ suggestions: [{ catalogItemRef: '16' }] }),
      );
    const search = searchMock(many);
    const { matcher } = createMatcher(createMessage, search);

    const result = await matcher.match('tenant-1', 'anything');

    expect(search).toHaveBeenCalledWith('tenant-1', '');
    const toolResult = JSON.stringify(
      createMessage.mock.calls[1][0].messages.at(-1),
    );
    expect(toolResult).toContain('\\"ref\\":\\"1\\"');
    expect(toolResult).toContain('\\"ref\\":\\"16\\"');
    expect(result.suggestions[0].catalogItemId).toBe('cat-15');
  });

  it('rejects a suggestion before any catalog row was sent', async () => {
    // Defensive: if the model answers without a successful search, the registry
    // is empty, so every ref is unknown and nothing is suggested.
    const createMessage = createMessageMock().mockResolvedValue(
      textSuggestions({
        suggestions: [{ catalogItemRef: '1', quantity: 1 }],
      }),
    );
    const { matcher } = createMatcher(createMessage);

    const result = await matcher.match('tenant-1', 'anything');

    expect(result.suggestions).toEqual([]);
  });

  it('reuses the same ref when another search returns the same item', async () => {
    const createMessage = createMessageMock()
      .mockResolvedValueOnce(toolUseMessage())
      .mockResolvedValueOnce(toolUseMessage())
      .mockResolvedValueOnce(
        textSuggestions({ suggestions: [{ catalogItemRef: '1' }] }),
      );
    const { matcher } = createMatcher(createMessage, searchMock([leaf]));

    const result = await matcher.match('tenant-1', 'leaves');

    const second = JSON.stringify(
      createMessage.mock.calls[1][0].messages.at(-1),
    );
    const third = JSON.stringify(
      createMessage.mock.calls[2][0].messages.at(-1),
    );
    expect(second).toContain('\\"ref\\":\\"1\\"');
    expect(third).toContain('\\"ref\\":\\"1\\"');
    expect(third).not.toContain('\\"ref\\":\\"2\\"');
    expect(result.suggestions[0].catalogItemId).toBe('cat-leaf');
  });

  it('reports an unknown tool as an error result instead of failing', async () => {
    const createMessage = createMessageMock()
      .mockResolvedValueOnce(
        message(
          [{ type: 'tool_use', id: 't9', name: 'run_sql', input: {} }],
          'tool_use',
        ),
      )
      .mockResolvedValueOnce(textSuggestions({ suggestions: [] }));
    const search = searchMock([]);
    const { matcher } = createMatcher(createMessage, search);

    const result = await matcher.match('tenant-1', 'anything');

    expect(search).not.toHaveBeenCalled();
    expect(result.suggestions).toEqual([]);
    const followUp = createMessage.mock.calls[1][0].messages.at(-1);
    expect(JSON.stringify(followUp)).toContain('"is_error":true');
  });

  it('stops after the hard tool-iteration cap', async () => {
    const createMessage =
      createMessageMock().mockResolvedValue(toolUseMessage());
    const { matcher } = createMatcher(createMessage, searchMock([leaf]));

    const result = await matcher.match('tenant-1', 'loop forever');

    expect(createMessage).toHaveBeenCalledTimes(AI_MAX_TOOL_ITERATIONS);
    expect(result.suggestions).toEqual([]);
  });
});

describe('CatalogMatcherService — failures', () => {
  it('propagates a provider error so the caller can map it', async () => {
    const createMessage = createMessageMock().mockRejectedValue(
      new Error('Request timed out'),
    );
    const { matcher } = createMatcher(createMessage);

    await expect(matcher.match('tenant-1', 'anything')).rejects.toThrow(
      'Request timed out',
    );
  });
});
