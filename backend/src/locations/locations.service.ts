import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  findAllStates() {
    return this.prisma.state.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  findCitiesByState(stateId: string) {
    return this.prisma.city.findMany({ where: { stateId, isActive: true }, orderBy: { name: 'asc' } });
  }

  createState(name: string) {
    return this.prisma.state.create({ data: { name } });
  }

  createCity(name: string, stateId: string, pincode?: string) {
    return this.prisma.city.create({ data: { name, stateId, pincode } });
  }

  updateState(id: string, data: { name?: string; isActive?: boolean }) {
    return this.prisma.state.update({ where: { id }, data });
  }

  updateCity(id: string, data: { name?: string; isActive?: boolean; pincode?: string }) {
    return this.prisma.city.update({ where: { id }, data });
  }

  /** Bulk import State-District-City-Pincode mapping (Prompt 9 requirement). */
  async bulkImportCities(rows: { state: string; city: string; pincode?: string }[]) {
    let created = 0;
    for (const row of rows) {
      const state = await this.prisma.state.upsert({
        where: { name: row.state },
        update: {},
        create: { name: row.state },
      });
      await this.prisma.city.create({
        data: { name: row.city, stateId: state.id, pincode: row.pincode },
      });
      created++;
    }
    return { created };
  }
}
