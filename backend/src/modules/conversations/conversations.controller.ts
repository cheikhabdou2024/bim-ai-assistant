import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CurrentUser } from '../auth/decorators/user.decorator';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all conversations for current user' })
  @ApiResponse({ status: 200, description: 'Conversations list' })
  findAll(@CurrentUser() user: { id: string }) {
    return this.conversationsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation with messages' })
  @ApiResponse({ status: 200, description: 'Conversation with messages' })
  @ApiResponse({ status: 404, description: 'Not found or not owner (ADR-008)' })
  findOne(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.conversationsService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new empty conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  create(@CurrentUser() user: { id: string }) {
    return this.conversationsService.create(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a conversation (and all its messages)' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found or not owner (ADR-008)' })
  remove(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.conversationsService.remove(id, user.id);
  }
}
