import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, UpdateAffiliateLinkDto } from './dto/product.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProductCategory, ProductStatus, UserRole } from '@prisma/client';

@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findPublic(@Query('category') category?: ProductCategory) {
    return this.productsService.findPublic(category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // --- Admin endpoints ---

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/all')
  findAllAdmin(@Query('category') category?: ProductCategory) {
    return this.productsService.findAllAdmin(category);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateProductDto, @CurrentUser() admin: any) {
    return this.productsService.create(dto, admin.id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() admin: any) {
    return this.productsService.update(id, dto, admin.id);
  }

  // Admin can change the affiliate link anytime — instantly reflected app-wide.
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/affiliate-link')
  updateLink(@Param('id') id: string, @Body() dto: UpdateAffiliateLinkDto, @CurrentUser() admin: any) {
    return this.productsService.updateAffiliateLink(id, dto, admin.id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(':id/affiliate-link/history')
  linkHistory(@Param('id') id: string) {
    return this.productsService.getLinkHistory(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body('status') status: ProductStatus, @CurrentUser() admin: any) {
    return this.productsService.setStatus(id, status, admin.id);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() admin: any) {
    return this.productsService.remove(id, admin.id);
  }
}
