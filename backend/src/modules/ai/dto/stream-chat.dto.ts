import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StreamChatDto {
  @ApiPropertyOptional({ description: 'Existing conversation ID (creates new if omitted)' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiProperty({ description: 'User message (max 4000 chars)', maxLength: 4000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;
}
