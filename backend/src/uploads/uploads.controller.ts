import { Body, Controller, Post } from '@nestjs/common';
import { UploadsService } from './uploads.service';

@Controller({ path: 'uploads', version: '1' })
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('presigned-url')
  getPresignedUrl(
    @Body('folder') folder: string,
    @Body('fileExtension') fileExtension: string,
    @Body('contentType') contentType: string,
  ) {
    // folder examples: "kyc/aadhaar", "kyc/pan", "bc/cancelled-cheque", "products"
    return this.uploadsService.getPresignedUploadUrl(folder, fileExtension, contentType);
  }
}
