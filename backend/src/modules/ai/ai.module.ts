import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiChatController } from './ai-chat.controller';
import { BimProxyController } from './bim-proxy.controller';
import { ConversationsModule } from '../conversations/conversations.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [ConversationsModule, PrismaModule],
  controllers: [AiChatController, BimProxyController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
