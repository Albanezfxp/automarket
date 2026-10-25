import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';

/**
 * Rede de segurança global: erros do Prisma que escapam de um service sem
 * try/catch (ex.: id não numérico vira NaN e o Prisma rejeita a query)
 * respondem com o status certo em vez de um 500 genérico.
 * P2002 → 409, P2003 → 400, P2025 → 404 (mesmo mapeamento dos services).
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ) {
    const response = host.switchToHttp().getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor.';

    if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Parâmetros inválidos.';
    } else if (exception.code === 'P2002') {
      status = HttpStatus.CONFLICT;
      message = 'Já existe um registro com esses dados.';
    } else if (exception.code === 'P2003') {
      status = HttpStatus.BAD_REQUEST;
      message = 'Referência inválida.';
    } else if (exception.code === 'P2025') {
      status = HttpStatus.NOT_FOUND;
      message = 'Registro não encontrado.';
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception.message);
    }

    response.status(status).json({ statusCode: status, message });
  }
}
