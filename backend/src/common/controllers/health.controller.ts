import { Controller, Get } from '@nestjs/common';
import { Public } from '../../modules/auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok', service: 'bim-ai-backend', timestamp: new Date().toISOString() };
  }
}
