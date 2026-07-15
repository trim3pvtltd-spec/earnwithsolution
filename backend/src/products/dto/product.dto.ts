import { IsString, IsOptional, IsEnum, IsNumber, IsArray, IsUrl, IsInt } from 'class-validator';
import { ProductCategory, ProductStatus } from '@prisma/client';

export class CreateProductDto {
  @IsString() title: string;
  @IsEnum(ProductCategory) category: ProductCategory;
  @IsOptional() @IsString() subCategory?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() shortDescription?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() payoutAmount?: number;
  @IsOptional() @IsNumber() payoutPercent?: number;
  @IsOptional() @IsString() eligibility?: string;
  @IsOptional() @IsArray() documentsRequired?: string[];
  @IsString() affiliateLink: string;
  @IsOptional() @IsString() trainingVideoUrl?: string;
  @IsOptional() faqs?: { question: string; answer: string }[];
  @IsOptional() @IsString() terms?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsInt() displayOrder?: number;
}

export class UpdateProductDto extends CreateProductDto {}

export class UpdateAffiliateLinkDto {
  @IsUrl({ require_tld: false })
  newLink: string;
}
