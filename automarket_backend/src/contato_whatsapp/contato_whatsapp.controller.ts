import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ContatoWhatsappService } from './contato_whatsapp.service';
import { CreateContatoWhatsappDto } from './dto/create-contato_whatsapp.dto';

@Controller('contato-whatsapp')
export class ContatoWhatsappController {
  constructor(
    private readonly contatoWhatsappService: ContatoWhatsappService,
  ) {}

  @Post()
  create(@Body() createContatoWhatsappDto: CreateContatoWhatsappDto) {
    return this.contatoWhatsappService.create(createContatoWhatsappDto);
  }

  @Get()
  findAll() {
    return this.contatoWhatsappService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contatoWhatsappService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contatoWhatsappService.remove(+id);
  }
}
