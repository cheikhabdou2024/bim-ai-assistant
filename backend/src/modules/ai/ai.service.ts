import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

/** Retry helper — waits `ms` milliseconds */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Returns true when the Anthropic error is a transient overload (529) */
function isOverloaded(err: unknown): boolean {
  // Guard: Anthropic.APIError may be undefined in test environments (mocked SDK)
  if (typeof Anthropic.APIError !== 'undefined' && err instanceof Anthropic.APIError) {
    return err.status === 529;
  }
  // The SDK may also surface the error inside the stream as a plain Error
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('overloaded_error') || msg.includes('Overloaded');
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const BIM_SYSTEM_PROMPT = `Tu es un expert BIM (Building Information Modeling) spécialisé dans l'architecture en Afrique de l'Ouest.
Tu aides les architectes à concevoir des bâtiments en générant des modèles BIM structurés.

Quand l'utilisateur décrit un bâtiment, génère un modèle BIM au format JSON STRICT suivant :
\`\`\`json
{
  "type": "building",
  "name": "Nom du bâtiment",
  "floors": <entier entre 1 et 100>,
  "width": <largeur en mètres, entre 1 et 500>,
  "length": <longueur en mètres, entre 1 et 500>,
  "height": <hauteur PAR ÉTAGE en mètres, OBLIGATOIREMENT entre 2.5 et 6.0>,
  "rooms": [
    { "name": "Nom de la pièce", "area": <surface en m²> }
  ]
}
\`\`\`

CONTRAINTES STRICTES — ne jamais les dépasser, le système rejettera le fichier sinon :
- "height" (hauteur par étage) : MINIMUM 2.5 m, MAXIMUM 6.0 m
  * Logement standard : 2.7 à 3.0 m
  * Bureau / commerce : 3.0 à 4.0 m
  * Atelier / entrepôt : 4.0 à 6.0 m
  * JAMAIS inférieur à 2.5 m, JAMAIS supérieur à 6.0 m
- "floors" : entre 1 et 100
- "width" et "length" : entre 1 m et 500 m
- JSON UNIQUEMENT dans le bloc de code — pas de texte à l'intérieur du JSON
- Dimensions réalistes pour l'Afrique de l'Ouest (climat tropical, normes locales)
- Toujours expliquer le modèle en français avant ou après le JSON
- Si la description est floue, poser des questions de clarification avant de générer`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic;
  private readonly model = 'claude-sonnet-4-6';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('anthropic.apiKey');
    this.client = new Anthropic({ apiKey });
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const stream = this.client.messages.stream({
          model: this.model,
          max_tokens: 4096,
          system: BIM_SYSTEM_PROMPT,
          messages,
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            yield event.delta.text;
          }
        }

        // Cost tracking — log token usage after stream completes
        const finalMessage = await stream.finalMessage();
        this.logger.log(
          `[AI] tokens — input: ${finalMessage.usage.input_tokens}, output: ${finalMessage.usage.output_tokens}, model: ${this.model}`,
        );
        return; // success — exit retry loop
      } catch (err) {
        if (isOverloaded(err) && attempt < MAX_RETRIES - 1) {
          const waitMs = 2000 * 2 ** attempt; // 2s, 4s, 8s
          this.logger.warn(`[AI] overloaded — retry ${attempt + 1}/${MAX_RETRIES - 1} in ${waitMs}ms`);
          await sleep(waitMs);
          continue;
        }
        throw err; // propagate non-overload errors or final attempt
      }
    }
  }

  /**
   * Generate BIM JSON with retry on invalid JSON (max 2 retries).
   * Used when we need a guaranteed valid BIM JSON object.
   */
  async generateBIMJson(userPrompt: string, retries = 2): Promise<object> {
    const messages: ChatMessage[] = [{ role: 'user', content: userPrompt }];

    for (let attempt = 0; attempt <= retries; attempt++) {
      let fullContent = '';

      for await (const chunk of this.streamChat(messages)) {
        fullContent += chunk;
      }

      const bimJson = this.extractBIMJson(fullContent);
      if (bimJson) {
        return bimJson;
      }

      // Retry: ask Claude to correct the JSON
      if (attempt < retries) {
        this.logger.warn(`[AI] BIM JSON invalid on attempt ${attempt + 1}, retrying...`);
        messages.push({ role: 'assistant', content: fullContent });
        messages.push({
          role: 'user',
          content: 'Le JSON généré est invalide. Génère UNIQUEMENT le bloc JSON valide, sans texte supplémentaire.',
        });
      }
    }

    throw new Error('Failed to generate valid BIM JSON after retries');
  }

  extractBIMJson(content: string): object | null {
    // Match ```json ... ``` or ``` ... ``` blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (!jsonMatch) return null;

    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed?.type === 'building') return parsed;
    } catch {
      // invalid JSON — return null to trigger retry
    }

    return null;
  }
}
