import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import Redis from 'ioredis';

const CACHE_TTL = 60; // seconds

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private cacheKey(userId: string) {
    return `conversations:list:${userId}`;
  }

  private async invalidate(userId: string) {
    await this.redis.del(this.cacheKey(userId));
  }

  async findAll(userId: string) {
    const cached = await this.redis.get(this.cacheKey(userId));
    if (cached) return JSON.parse(cached);

    const conversations = await this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, userId: true, createdAt: true, updatedAt: true },
    });

    await this.redis.setex(this.cacheKey(userId), CACHE_TTL, JSON.stringify(conversations));
    return conversations;
  }

  async findOne(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async create(userId: string) {
    const conversation = await this.prisma.conversation.create({
      data: { userId, title: 'Nouvelle conversation' },
    });
    await this.invalidate(userId);
    return conversation;
  }

  async remove(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    await this.prisma.conversation.delete({ where: { id } });
    await this.invalidate(userId);
  }

  /**
   * Ensure a conversation exists and save the USER message.
   * Creates a new conversation if conversationId is not provided.
   * Returns the conversation with all messages (for Claude context).
   */
  async ensureConversationWithUserMessage(
    conversationId: string | undefined,
    userId: string,
    userMessage: string,
  ) {
    let convId = conversationId;

    if (!convId) {
      // Auto-title from first 60 chars of first message
      const title = userMessage.slice(0, 60) + (userMessage.length > 60 ? '…' : '');
      const conv = await this.prisma.conversation.create({
        data: { userId, title },
      });
      convId = conv.id;
      await this.invalidate(userId);
    } else {
      // Verify ownership
      const conv = await this.prisma.conversation.findFirst({
        where: { id: convId, userId },
      });
      if (!conv) throw new NotFoundException('Conversation not found');
    }

    // Persist USER message
    await this.prisma.message.create({
      data: { conversationId: convId, role: 'USER', content: userMessage },
    });

    // Return conversation with all messages (for Claude context)
    return this.prisma.conversation.findUnique({
      where: { id: convId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  /**
   * Persist the ASSISTANT message after streaming is complete.
   * ADR-011: bimData persisted here — before any bim-service call.
   */
  async saveAssistantMessage(
    conversationId: string,
    content: string,
    bimData?: object,
  ) {
    await this.prisma.message.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content,
        bimData: bimData ?? undefined,
      },
    });

    // Update conversation updatedAt (touch)
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }
}
