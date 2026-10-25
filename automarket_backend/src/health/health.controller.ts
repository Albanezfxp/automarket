import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/auth/public.decorator';

/**
 * Healthcheck para o ping anti-suspensão do Render (UptimeRobot).
 * Propositalmente não toca no banco: o objetivo é só manter a instância
 * acordada, e um ping a cada 5 min não deve acordar o Neon à toa.
 */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): string {
    return 'ok';
  }
}
