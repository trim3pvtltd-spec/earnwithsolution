import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BanksService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.bank.findMany({ where: { status: 'active' } });
  }

  findAllAdmin() {
    return this.prisma.bank.findMany();
  }

  create(name: string, logoUrl?: string) {
    return this.prisma.bank.create({ data: { name, logoUrl } });
  }

  update(id: string, data: { name?: string; logoUrl?: string; status?: string }) {
    return this.prisma.bank.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.bank.delete({ where: { id } });
  }
}
