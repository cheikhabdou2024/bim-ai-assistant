import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { AiService, ChatMessage } from './ai.service';
import { ConversationsService } from '../conversations/conversations.service';
import { StreamChatDto } from './dto/stream-chat.dto';
import { CurrentUser } from '../auth/decorators/user.decorator';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class AiChatController {
  private readonly logger = new Logger(AiChatController.name);

  constructor(
    private readonly aiService: AiService,
    private readonly conversationsService: ConversationsService,
  ) {}

  @Post('stream')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stream AI chat response (SSE via POST, ADR-009)' })
  @ApiProduces('text/event-stream')
  async streamChat(
    @CurrentUser() user: { id: string },
    @Body() dto: StreamChatDto,
    @Res() res: Response,
  ) {
    // ── SSE headers — flush immediately (ADR-009, Tech Lead Dev review point #1) ──
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx/ALB buffering
    res.flushHeaders(); // CRITICAL — sends headers before first chunk

    // Persist USER message + ensure conversation exists
    const conversation = await this.conversationsService.ensureConversationWithUserMessage(
      dto.conversationId,
      user.id,
      dto.message,
    );

    if (!conversation) {
      res.write(`data: ${JSON.stringify({ error: 'Conversation error' })}\n\n`);
      res.end();
      return;
    }

    // Build messages history for Claude API
    const messages: ChatMessage[] = conversation.messages.map((m) => ({
      role: m.role === 'USER' ? 'user' : 'assistant',
      content: m.content,
    }));

    // Stream from Claude API — write each chunk as SSE event
    let fullContent = '';
    try {
      for await (const chunk of this.aiService.streamChat(messages)) {
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
    } catch (err) {
      this.logger.error('[Chat] Stream error:', err);
      res.write(`data: ${JSON.stringify({ error: 'Génération interrompue, veuillez réessayer' })}\n\n`);
    }

    // ADR-011 — detect BIM JSON + persist BEFORE any bim-service call
    const bimData = this.aiService.extractBIMJson(fullContent) ?? undefined;
    await this.conversationsService.saveAssistantMessage(
      conversation.id,
      fullContent,
      bimData,
    );

    res.write('data: [DONE]\n\n');
    res.end();
  }
}
