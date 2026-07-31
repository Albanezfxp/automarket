import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { VendedorService } from './vendedor.service';
import { CreateVendedorDto } from './dto/create-vendedor.dto';
import { UpdateVendedorDto } from './dto/update-vendedor.dto';

@Controller('vendedor')
export class VendedorController {
  constructor(private readonly vendedorService: VendedorService) {}

  @Post()
  create(@Body() createVendedorDto: CreateVendedorDto) {
    return this.vendedorService.create(createVendedorDto);
  }

  @Get()
  findAll() {
    return this.vendedorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vendedorService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVendedorDto: UpdateVendedorDto,
  ) {
    return this.vendedorService.update(+id, updateVendedorDto);
  }

  @Patch('desativar-vendedor/:id')
  disactive(@Param('id') id: string) {
    return this.vendedorService.deactivate(+id);
  }

  @Patch('reativar-vendedor/:id')
  reactive(@Param('id') id: string) {
    return this.vendedorService.reactivate(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vendedorService.remove(+id);
  }
}
