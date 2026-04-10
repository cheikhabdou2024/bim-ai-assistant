import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/user.decorator';

@ApiTags('bim')
@ApiBearerAuth()
@Controller('bim')
export class BimProxyController {
  private readonly logger = new Logger(BimProxyController.name);
  private readonly bimServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.bimServiceUrl = this.configService.get<string>('bimServiceUrl') ?? 'http://localhost:8000';
  }

  private async proxyToBimService(
    path: string,
    body: object,
    timeoutMs = 10000,
  ): Promise<object> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.bimServiceUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => 'BIM service error');
        throw new BadGatewayException(detail);
      }

      return response.json() as Promise<object>;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new BadGatewayException('BIM service timeout');
      }
      if (err instanceof BadGatewayException) throw err;
      this.logger.error('[BIM Proxy] Error:', err);
      throw new BadGatewayException('BIM service unavailable');
    } finally {
      clearTimeout(timer);
    }
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate BIM JSON structure via bim-service' })
  @ApiResponse({ status: 200, description: '{ valid: boolean, errors: string[] }' })
  validate(
    @CurrentUser() _user: { id: string },
    @Body() body: { bimData: object },
  ) {
    return this.proxyToBimService('/validate', body.bimData, 10000);
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Generate IFC file from BIM JSON + upload to S3' })
  @ApiResponse({ status: 201, description: '{ s3Key: string, downloadUrl: string }' })
  generate(
    @CurrentUser() _user: { id: string },
    @Body() body: { bimData: object },
  ) {
    // 35s timeout — IFC generation is CPU-intensive
    return this.proxyToBimService('/generate', body.bimData, 35000);
  }
}
