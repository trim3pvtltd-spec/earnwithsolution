import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private prisma: PrismaService) {}

  private startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async getDashboardKpis() {
    const todayStart = this.startOfToday();
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [todayLeads, yesterdayLeads, pendingLeads, pendingWithdrawals, totalUsers] = await Promise.all([
      this.prisma.lead.count({ where: { submittedAt: { gte: todayStart } } }),
      this.prisma.lead.count({ where: { submittedAt: { gte: yesterdayStart, lt: todayStart } } }),
      this.prisma.lead.count({ where: { status: 'PENDING' } }),
      this.prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count(),
    ]);

    const todayEarningsAgg = await this.prisma.walletTransaction.aggregate({
      where: { createdAt: { gte: todayStart }, type: 'CREDIT', status: 'APPROVED' },
      _sum: { amount: true },
    });

    const totalLeads = await this.prisma.lead.count();
    const approvedLeads = await this.prisma.lead.count({ where: { status: 'APPROVED' } });
    const conversionRate = totalLeads > 0 ? (approvedLeads / totalLeads) * 100 : 0;

    return {
      todayLeads,
      todayLeadsTrend: yesterdayLeads > 0 ? ((todayLeads - yesterdayLeads) / yesterdayLeads) * 100 : 0,
      todayEarnings: todayEarningsAgg._sum.amount || 0,
      pendingLeads,
      pendingWithdrawals,
      totalUsers,
      conversionRate: Number(conversionRate.toFixed(2)),
    };
  }

  async getMonthlyRevenue(months = 12) {
    const results: { month: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const agg = await this.prisma.walletTransaction.aggregate({
        where: { createdAt: { gte: start, lt: end }, type: 'CREDIT', status: 'APPROVED' },
        _sum: { amount: true },
      });
      results.push({
        month: start.toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
        revenue: Number(agg._sum.amount || 0),
      });
    }
    return results;
  }

  async getTopProducts(limit = 10) {
    const grouped = await this.prisma.lead.groupBy({
      by: ['productId'],
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    });
    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
    });
    return grouped.map((g) => ({
      product: products.find((p) => p.id === g.productId),
      leadCount: g._count.productId,
    }));
  }

  async getTopExecutives(limit = 10) {
    const grouped = await this.prisma.lead.groupBy({
      by: ['executiveId'],
      where: { executiveId: { not: null }, status: 'APPROVED' },
      _count: { executiveId: true },
      orderBy: { _count: { executiveId: 'desc' } },
      take: limit,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.executiveId as string) } },
      include: { wallet: true },
    });
    return grouped.map((g) => ({
      executive: users.find((u) => u.id === g.executiveId),
      approvedLeads: g._count.executiveId,
    }));
  }

  async getStateWiseSales() {
    const grouped = await this.prisma.lead.groupBy({
      by: ['state'],
      where: { status: 'APPROVED' },
      _count: { state: true },
      orderBy: { _count: { state: 'desc' } },
    });
    return grouped.map((g) => ({ state: g.state, count: g._count.state }));
  }

  async getConversionFunnel() {
    const [total, pending, inProcess, approved, rejected, duplicate] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { status: 'PENDING' } }),
      this.prisma.lead.count({ where: { status: 'IN_PROCESS' } }),
      this.prisma.lead.count({ where: { status: 'APPROVED' } }),
      this.prisma.lead.count({ where: { status: 'REJECTED' } }),
      this.prisma.lead.count({ where: { status: 'DUPLICATE' } }),
    ]);
    return { total, pending, inProcess, approved, rejected, duplicate };
  }
}
