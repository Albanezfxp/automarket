import { Body, Controller, Post } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { PresignUploadDto } from './dto/presign-upload.dto';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('presign')
  presign(@Body() presignUploadDto: PresignUploadDto) {
    return this.uploadsService.createPresignedUpload(presignUploadDto);
  }
}
