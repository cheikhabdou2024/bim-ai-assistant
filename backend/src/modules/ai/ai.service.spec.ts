/**
 * AIService Unit Tests — TC-046 → TC-050
 * Mocks @anthropic-ai/sdk entirely — never calls real API in CI.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService, ChatMessage } from './ai.service';

// ── Mock @anthropic-ai/sdk ────────────────────────────────────────────────────
const mockFinalMessage = jest.fn().mockResolvedValue({
  usage: { input_tokens: 100, output_tokens: 200 },
});

const mockStream = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        stream: mockStream,
      },
    })),
  };
});

// Helper: create an async iterable that yields text_delta events
function makeStreamEvents(chunks: string[]) {
  const events = chunks.map((text) => ({
    type: 'content_block_delta',
    delta: { type: 'text_delta', text },
  }));

  return {
    [Symbol.asyncIterator]: async function* () {
      for (const event of events) yield event;
    },
    finalMessage: mockFinalMessage,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('AiService Unit Tests (TC-046 → TC-050)', () => {
  let service: AiService;
  let loggerSpy: jest.SpyInstance;

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('sk-test-mock-anthropic-key'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    loggerSpy = jest.spyOn((service as any).logger, 'log').mockImplementation(() => {});
  });

  // TC-046 — streamChat returns AsyncGenerator with text chunks
  it('TC-046: streamChat yields text chunks from SDK stream', async () => {
    mockStream.mockReturnValue(makeStreamEvents(['Bonjour', ' architecte', ' BIM !']));

    const messages: ChatMessage[] = [{ role: 'user', content: 'Décris un bâtiment' }];
    const chunks: string[] = [];

    for await (const chunk of service.streamChat(messages)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Bonjour', ' architecte', ' BIM !']);
    expect(mockStream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages,
      }),
    );
  });

  // TC-047 — generateBIMJson retries on invalid JSON (max 2)
  it('TC-047: generateBIMJson retries on invalid JSON, succeeds on 2nd attempt', async () => {
    const validBIM = `\`\`\`json\n{"type":"building","name":"Test","floors":3,"width":20,"length":30,"height":3.5}\n\`\`\``;

    mockStream
      .mockReturnValueOnce(makeStreamEvents(['Not valid JSON at all'])) // attempt 1 — fail
      .mockReturnValueOnce(makeStreamEvents([validBIM]));               // attempt 2 — success

    const result = await service.generateBIMJson('Génère un immeuble');

    expect(result).toMatchObject({ type: 'building', name: 'Test' });
    expect(mockStream).toHaveBeenCalledTimes(2);
  });

  // TC-047b — generateBIMJson throws after max retries
  it('TC-047b: generateBIMJson throws after all retries exhausted', async () => {
    mockStream.mockReturnValue(makeStreamEvents(['still not valid JSON']));

    await expect(service.generateBIMJson('bad prompt', 1)).rejects.toThrow(
      'Failed to generate valid BIM JSON after retries',
    );
    expect(mockStream).toHaveBeenCalledTimes(2); // initial + 1 retry
  });

  // TC-048 — timeout / error during stream → generator throws
  it('TC-048: streamChat propagates SDK errors', async () => {
    const errorStream = {
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'partial' } };
        throw new Error('Stream connection lost');
      },
      finalMessage: mockFinalMessage,
    };
    mockStream.mockReturnValue(errorStream);

    const chunks: string[] = [];
    await expect(async () => {
      for await (const chunk of service.streamChat([{ role: 'user', content: 'test' }])) {
        chunks.push(chunk);
      }
    }).rejects.toThrow('Stream connection lost');

    expect(chunks).toEqual(['partial']);
  });

  // TC-049 — System prompt BIM is always injected
  it('TC-049: BIM system prompt is injected in every stream call', async () => {
    mockStream.mockReturnValue(makeStreamEvents(['ok']));

    const gen = service.streamChat([{ role: 'user', content: 'hello' }]);
    await gen.next(); // consume one chunk to trigger the call

    expect(mockStream).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('expert BIM'),
      }),
    );
  });

  // TC-050 — Cost tracking: tokens are logged after stream
  it('TC-050: token usage is logged after stream completes', async () => {
    mockFinalMessage.mockResolvedValueOnce({
      usage: { input_tokens: 512, output_tokens: 1024 },
    });
    mockStream.mockReturnValue(makeStreamEvents(['chunk1', 'chunk2']));

    for await (const _ of service.streamChat([{ role: 'user', content: 'test' }])) {
      // consume
    }

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('input: 512'),
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('output: 1024'),
    );
  });

  // TC-049b — extractBIMJson correctly detects BIM JSON
  it('TC-049b: extractBIMJson detects valid BIM JSON in code block', () => {
    const content = `Voici votre modèle :\n\`\`\`json\n{"type":"building","name":"Dakar Tower","floors":10,"width":30,"length":40,"height":4}\n\`\`\`\nBonne chance !`;
    const result = service.extractBIMJson(content);
    expect(result).toMatchObject({ type: 'building', name: 'Dakar Tower' });
  });

  it('TC-049c: extractBIMJson returns null for non-BIM JSON', () => {
    const content = '```json\n{"type":"house"}\n```';
    expect(service.extractBIMJson(content)).toBeNull();
  });

  it('TC-049d: extractBIMJson returns null when no code block', () => {
    expect(service.extractBIMJson('plain text without json')).toBeNull();
  });
});
