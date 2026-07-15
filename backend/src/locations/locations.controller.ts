import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller({ path: 'locations', version: '1' })
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Get('states')
  findStates() {
    return this.locationsService.findAllStates();
  }

  @Get('states/:stateId/cities')
  findCities(@Param('stateId') stateId: string) {
    return this.locationsService.findCitiesByState(stateId);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('states')
  createState(@Body('name') name: string) {
    return this.locationsService.createState(name);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('cities')
  createCity(@Body('name') name: string, @Body('stateId') stateId: string, @Body('pincode') pincode?: string) {
    return this.locationsService.createCity(name, stateId, pincode);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('states/:id')
  updateState(@Param('id') id: string, @Body() data: any) {
    return this.locationsService.updateState(id, data);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('cities/:id')
  updateCity(@Param('id') id: string, @Body() data: any) {
    return this.locationsService.updateCity(id, data);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('cities/bulk-import')
  bulkImport(@Body('rows') rows: { state: string; city: string; pincode?: string }[]) {
    return this.locationsService.bulkImportCities(rows);
  }
}
