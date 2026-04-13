import { ApiProperty } from '@nestjs/swagger';

export class BimDownloadUrlResponseDto {
  @ApiProperty({
    example: 'https://s3.amazonaws.com/bim-bucket/models/proj-uuid/immeuble.ifc?X-Amz-Signature=...',
    description: 'URL présignée S3 pour télécharger le fichier IFC (valide 15 min)',
  })
  url: string;

  @ApiProperty({
    example: 900,
    description: 'Durée de validité de l\'URL en secondes (900 = 15 minutes)',
  })
  expiresIn: number;
}
