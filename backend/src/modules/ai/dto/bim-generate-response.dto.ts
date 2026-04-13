import { ApiProperty } from '@nestjs/swagger';

export class BimGenerateResponseDto {
  @ApiProperty({
    example: 'models/proj-uuid/immeuble_20260412.ifc',
    description: 'Clé S3 du fichier IFC généré',
  })
  s3Key: string;

  @ApiProperty({
    example: 'immeuble_20260412.ifc',
    description: 'Nom du fichier IFC généré',
  })
  fileName: string;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/bim-bucket/models/proj-uuid/immeuble_20260412.ifc?X-Amz-Signature=...',
    description: 'URL présignée S3 pour télécharger immédiatement le fichier',
  })
  downloadUrl: string;

  @ApiProperty({
    example: 'COMPLETED',
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
    description: 'Statut final de la génération',
  })
  status: string;

  @ApiProperty({
    example: 3,
    description: 'Nombre d\'étages générés dans le modèle IFC',
  })
  floors: number;
}
