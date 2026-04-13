import { ApiProperty } from '@nestjs/swagger';

export class BimModelDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'UUID du modèle BIM' })
  id: string;

  @ApiProperty({
    example: 'models/proj-uuid/immeuble.ifc',
    nullable: true,
    description: 'Clé S3 du fichier IFC (null si génération en cours)',
  })
  s3Key: string | null;

  @ApiProperty({
    example: 'immeuble.ifc',
    nullable: true,
    description: 'Nom du fichier IFC (null si génération en cours)',
  })
  fileName: string | null;

  @ApiProperty({
    example: 'COMPLETED',
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
    description: 'Statut de génération du modèle',
  })
  status: string;

  @ApiProperty({ description: 'Date de création du modèle' })
  createdAt: Date;
}

export class BimModelsResponseDto {
  @ApiProperty({
    type: [BimModelDto],
    description: 'Liste des modèles BIM du projet',
  })
  data: BimModelDto[];
}
