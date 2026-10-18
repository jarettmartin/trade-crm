import { describe, expect, it, jest } from '@jest/globals';
import type Anthropic from '@anthropic-ai/sdk';
import {
  buildSystemPrompt,
  CATALOG_SEARCH_TOOL,
  CatalogMatcherService,
  extractJsonObject,
  normalizeQuantity,
  parseCatalogMatchResult,
} from './catalog-matcher.service';
import type {
  CatalogSnapshot,
  CatalogToolItem,
  CatalogToolService,
} from './catalog-tool.service';
import type { AnthropicClient } from '../anthropic.client';
import {
  AI_INLINE_MAX_CHARS,
  AI_INLINE_MAX_ITEMS,
  AI_MAX_TOOL_ITERATIONS,
} from '../ai-estimator.config';

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

describe('buildSystemPrompt', () => {
  it('tells the tool path to search short, distinctive keywords', () => {
    const prompt = buildSystemPrompt(false);

    expect(prompt).toContain('search_catalog');
    expect(prompt).toContain('1-3 distinctive keywords');
    expect(prompt).toContain('catalogItemRef');
  });

  it('tells the inline path that the catalog is already provided', () => {
    const prompt = buildSystemPrompt(true);

    expect(prompt).toContain('complete catalog is provided');
    expect(prompt).not.toContain('You MUST call search_catalog');
    expect(prompt).toContain('catalogItemRef');
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

function snapshotMock(items: CatalogToolItem[], total = items.length) {
  return jest
    .fn<(tenantId: string, limit: number) => Promise<CatalogSnapshot>>()
    .mockResolvedValue({ items, total });
}

function searchMock(items: CatalogToolItem[]) {
  return jest
    .fn<(tenantId: string, query: string) => Promise<CatalogToolItem[]>>()
    .mockResolvedValue(items);
}

type SnapshotMock = ReturnType<typeof snapshotMock>;
type SearchMock = ReturnType<typeof searchMock>;

function createMatcher(
  createMessage: CreateMessageMock,
  options: { snapshot?: SnapshotMock; search?: SearchMock } = {},
) {
  const snapshot = options.snapshot ?? snapshotMock([leaf]);
  const search = options.search ?? searchMock([]);

  const anthropic = {
    createMessage,
    configured: true,
    modelId: 'claude-haiku-5-5',
  } as unknown as AnthropicClient;
  const catalogTool = { snapshot, search } as unknown as CatalogToolService;

  return {
    matcher: new CatalogMatcherService(anthropic, catalogTool),
    snapshot,
    search,
  };
}

/** A catalog that is too big to inline, which forces the tool path. */
const largeCatalog = () => snapshotMock([leaf], AI_INLINE_MAX_ITEMS + 1);

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

/** The user-turn text of a request (the inline path sends a string). */
function userText(params: Anthropic.MessageCreateParamsNonStreaming): string {
  const content = params.messages[0].content;
  return typeof content === 'string' ? content : JSON.stringify(content);
}

describe('CatalogMatcherService — inline path (small catalog)', () => {
  it('sends the whole catalog in one call, with refs and no tool', async () => {
    const createMessage = createMessageMock().mockResolvedValue(
      textSuggestions({
        suggestions: [{ catalogItemRef: '1', quantity: 2 }],
      }),
    );
    const { matcher, snapshot, search } = createMatcher(createMessage);

    const result = await matcher.match('tenant-1', 'clear the leaves');

    expect(snapshot).toHaveBeenCalledWith('tenant-1', AI_INLINE_MAX_ITEMS);
    expect(search).not.toHaveBeenCalled();
    expect(createMessage).toHaveBeenCalledTimes(1);

    const params = createMessage.mock.calls[0][0];
    expect(params.tools).toBeUndefined();

    const content = userText(params);
    expect(content).toContain('Complete catalog');
    expect(content).toContain('"ref":"1"');
    expect(content).toContain('Leaf removal and disposal');
    // The UUID never goes over the wire — that's the token/reliability win.
    expect(content).not.toContain('cat-leaf');

    expect(result.suggestions[0]).toMatchObject({
      catalogItemId: 'cat-leaf',
      description: 'Leaf removal and disposal',
      quantity: 2,
    });
  });

  it('falls back to the tool when the catalog is too big to inline by size', async () => {
    const huge: CatalogToolItem = {
      ...leaf,
      description: 'x'.repeat(AI_INLINE_MAX_CHARS),
    };
    const createMessage = createMessageMock().mockResolvedValue(
      textSuggestions({ suggestions: [] }),
    );
    const { matcher } = createMatcher(createMessage, {
      snapshot: snapshotMock([huge], 1),
      search: searchMock([]),
    });

    await matcher.match('tenant-1', 'anything');

    expect(createMessage.mock.calls[0][0].tools).toHaveLength(1);
  });
});

describe('CatalogMatcherService — tool path (large catalog)', () => {
  it('keeps the catalog out of the prompt, searches, and maps refs back', async () => {
    const createMessage = createMessageMock()
      .mockResolvedValueOnce(toolUseMessage())
      .mockResolvedValueOnce(
        textSuggestions({
          suggestions: [{ catalogItemRef: '1', quantity: 1 }],
        }),
      );
    const search = searchMock([leaf]);
    const { matcher } = createMatcher(createMessage, {
      snapshot: largeCatalog(),
      search,
    });

    const result = await matcher.match('tenant-1', 'clear the leaves');

    expect(createMessage).toHaveBeenCalledTimes(2);

    const first = createMessage.mock.calls[0][0];
    expect(first.tools).toHaveLength(1);
    const firstContent = userText(first);
    expect(firstContent).not.toContain('Leaf removal and disposal');
    expect(firstContent).not.toContain('"ref"');

    expect(search).toHaveBeenCalledWith('tenant-1', 'leaf');

    const toolResult = JSON.stringify(
      createMessage.mock.calls[1][0].messages.at(-1),
    );
    expect(toolResult).toContain('tool_result');
    expect(toolResult).toContain('\\"ref\\":\\"1\\"');
    expect(toolResult).not.toContain('cat-leaf');

    expect(result.suggestions[0]).toMatchObject({
      catalogItemId: 'cat-leaf',
      description: 'Leaf removal and disposal',
    });
  });

  it('never resolves a ref from the snapshot the model was not given', async () => {
    // Large catalog → the snapshot is never sent, so a suggestion returned on
    // the first turn (without a search) must be rejected.
    const createMessage = createMessageMock().mockResolvedValue(
      textSuggestions({
        suggestions: [{ catalogItemRef: '1', quantity: 1 }],
      }),
    );
    const { matcher } = createMatcher(createMessage, {
      snapshot: largeCatalog(),
      search: searchMock([]),
    });

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
    const { matcher } = createMatcher(createMessage, {
      snapshot: largeCatalog(),
      search: searchMock([leaf]),
    });

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
    const { matcher } = createMatcher(createMessage, {
      snapshot: largeCatalog(),
      search,
    });

    const result = await matcher.match('tenant-1', 'anything');

    expect(search).not.toHaveBeenCalled();
    expect(result.suggestions).toEqual([]);
    const followUp = createMessage.mock.calls[1][0].messages.at(-1);
    expect(JSON.stringify(followUp)).toContain('"is_error":true');
  });

  it('stops after the hard tool-iteration cap', async () => {
    const createMessage =
      createMessageMock().mockResolvedValue(toolUseMessage());
    const { matcher } = createMatcher(createMessage, {
      snapshot: largeCatalog(),
      search: searchMock([leaf]),
    });

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
