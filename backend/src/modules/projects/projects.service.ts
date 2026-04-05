import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private getCacheKey(userId: string, page: number, limit: number): string {
    return `projects:list:${userId}:${page}:${limit}`;
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    const pattern = `projects:list:${userId}:*`;
    const keys: string[] = [];
    const stream = this.redis.scanStream({ match: pattern, count: 100 });
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (batch: string[]) => keys.push(...batch));
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    if (keys.length > 0) await this.redis.del(...keys);
  }

  async findAllByUser(userId: string, query: ProjectQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const cacheKey = this.getCacheKey(userId, page, limit);

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as ReturnType<typeof this.fetchFromDb>;

    const result = await this.fetchFromDb(userId, page, limit, query.status);
    await this.redis.setex(cacheKey, 300, JSON.stringify(result));
    return result;
  }

  private async fetchFromDb(
    userId: string,
    page: number,
    limit: number,
    status?: string,
  ) {
    const where = { userId, ...(status ? { status: status as any } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: { ...dto, userId },
    });
    await this.invalidateUserCache(userId);
    return project;
  }

  async update(id: string, userId: string, dto: UpdateProjectDto) {
    await this.findOne(id, userId);
    const project = await this.prisma.project.update({
      where: { id },
      data: dto,
    });
    await this.invalidateUserCache(userId);
    return project;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.prisma.project.delete({ where: { id } });
    await this.invalidateUserCache(userId);
  }
}
