import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

/**
 * Generates short-lived presigned S3 URLs so the mobile/web app can
 * upload documents (Aadhaar, PAN, photos, cancelled cheques) DIRECTLY
 * to S3 without the file ever passing through our backend server.
 * Bucket is private — objects are only reachable via signed URLs.
 */
@Injectable()
export class UploadsService {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    this.bucket = process.env.AWS_S3_BUCKET || '';
  }

  async getPresignedUploadUrl(folder: string, fileExtension: string, contentType: string) {
    const key = `${folder}/${uuid()}.${fileExtension}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 }); // 5 min

    return {
      uploadUrl,
      fileKey: key,
      publicUrl: `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    };
  }
}
