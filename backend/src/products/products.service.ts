import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminActionLogger } from '../admin/admin-action-logger.service';
import { CreateProductDto, UpdateProductDto, UpdateAffiliateLinkDto } from './dto/product.dto';
import { ProductCategory, ProductStatus } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private actionLogger: AdminActionLogger,
  ) {}

  /** Public catalog — customers/executives browse active products only. */
  async findPublic(category?: ProductCategory) {
    return this.prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE, ...(category ? { category } : {}) },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  /** Admin — full list including inactive/coming soon. */
  async findAllAdmin(category?: ProductCategory) {
    return this.prisma.product.findMany({
      where: category ? { category } : {},
      orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }],
    });
  }

  async create(dto: CreateProductDto, adminId: string) {
    const product = await this.prisma.product.create({ data: dto as any });
    await this.actionLogger.log(adminId, 'products', 'created_product', product.id, null, product);
    return product;
  }

  async update(id: string, dto: UpdateProductDto, adminId: string) {
    const before = await this.findOne(id);
    const product = await this.prisma.product.update({ where: { id }, data: dto as any });
    await this.actionLogger.log(adminId, 'products', 'updated_product', id, before, product);
    return product;
  }

  /**
   * The core requirement from the founder: Admin must be able to change
   * the affiliate link at ANY time, with zero app redeploy, and every
   * change must be tracked (who changed it, from what, to what, when).
   */
  async updateAffiliateLink(id: string, dto: UpdateAffiliateLinkDto, adminId: string) {
    const product = await this.findOne(id);

    await this.prisma.affiliateLinkHistory.create({
      data: {
        productId: id,
        oldLink: product.affiliateLink,
        newLink: dto.newLink,
        changedById: adminId,
      },
    });

    const updated = await this.prisma.product.update({
      where: { id },
      data: { affiliateLink: dto.newLink },
    });

    await this.actionLogger.log(adminId, 'products', 'changed_affiliate_link', id, {
      oldLink: product.affiliateLink,
    }, { newLink: dto.newLink });

    return updated;
  }

  async getLinkHistory(id: string) {
    return this.prisma.affiliateLinkHistory.findMany({
      where: { productId: id },
      orderBy: { changedAt: 'desc' },
    });
  }

  async setStatus(id: string, status: ProductStatus, adminId: string) {
    const product = await this.prisma.product.update({ where: { id }, data: { status } });
    await this.actionLogger.log(adminId, 'products', 'changed_status', id, null, { status });
    return product;
  }

  async remove(id: string, adminId: string) {
    await this.prisma.product.delete({ where: { id } });
    await this.actionLogger.log(adminId, 'products', 'deleted_product', id);
    return { success: true };
  }
}
