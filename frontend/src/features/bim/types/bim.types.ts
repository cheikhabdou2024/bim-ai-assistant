export interface BIMModel {
  id: string
  s3Key: string | null
  fileName: string | null
  status: string
  createdAt: string
}

export interface BIMModelsResponse {
  data: BIMModel[]
}

export interface BIMDownloadUrlResponse {
  url: string
  expiresIn: number
}
