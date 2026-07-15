import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminReportsService } from './admin-reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller({ path: 'admin/dashboard', version: '1' })
export class AdminDashboardController {
  constructor(
    private dashboardService: AdminDashboardService,
    private reportsService: AdminReportsService,
  ) {}

  @Get('kpis')
  getKpis() {
    return this.dashboardService.getDashboardKpis();
  }

  @Get('monthly-revenue')
  getMonthlyRevenue(@Query('months') months?: string) {
    return this.dashboardService.getMonthlyRevenue(months ? Number(months) : 12);
  }

  @Get('top-products')
  getTopProducts() {
    return this.dashboardService.getTopProducts();
  }

  @Get('top-executives')
  getTopExecutives() {
    return this.dashboardService.getTopExecutives();
  }

  @Get('state-wise-sales')
  getStateWiseSales() {
    return this.dashboardService.getStateWiseSales();
  }

  @Get('conversion-funnel')
  getConversionFunnel() {
    return this.dashboardService.getConversionFunnel();
  }

  @Get('export/leads.xlsx')
  async exportLeads(@Res() res: Response, @Query('status') status?: string) {
    const buffer = await this.reportsService.exportLeadsToExcel({ status });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=leads-report.xlsx');
    res.send(buffer);
  }
}
