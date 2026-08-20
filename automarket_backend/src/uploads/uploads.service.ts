import { BadRequestException, Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { PresignUploadDto } from './dto/presign-upload.dto';

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

/**
 * Gera URLs pré-assinadas de upload direto pro R2 (compatível com S3) — o
 * arquivo nunca passa pelo Nest, só a assinatura da requisição de PUT.
 */
@Injectable()
export class UploadsService {
  private readonly s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  async createPresignedUpload(dto: PresignUploadDto): Promise<PresignedUpload> {
    const extensionFromFileName = dto.fileName.split('.').pop()?.toLowerCase();
    if (
      !extensionFromFileName ||
      !ALLOWED_EXTENSIONS.has(extensionFromFileName)
    ) {
      throw new BadRequestException('Extensão de arquivo não permitida.');
    }

    const expectedExtension = EXTENSION_BY_CONTENT_TYPE[dto.contentType];
    const normalizedExtension =
      extensionFromFileName === 'jpeg' ? 'jpg' : extensionFromFileName;
    if (normalizedExtension !== expectedExtension) {
      throw new BadRequestException(
        'Extensão do arquivo não corresponde ao tipo de conteúdo informado.',
      );
    }

    const key = `${dto.pasta}/${randomUUID()}.${expectedExtension}`;

    const uploadUrl = await getSignedUrl(
      this.s3Client,
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        ContentType: dto.contentType,
        ContentLength: dto.fileSize,
      }),
      { expiresIn: 60 },
    );

    const publicUrl = `${process.env.R2_PUBLIC_BASE_URL}/${key}`;

    return { uploadUrl, publicUrl, key };
  }
}
