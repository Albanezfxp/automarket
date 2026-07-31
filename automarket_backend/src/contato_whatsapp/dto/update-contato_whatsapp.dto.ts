import { PartialType } from '@nestjs/mapped-types';
import { CreateContatoWhatsappDto } from './create-contato_whatsapp.dto';

export class UpdateContatoWhatsappDto extends PartialType(CreateContatoWhatsappDto) {}
