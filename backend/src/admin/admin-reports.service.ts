import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class AdminReportsService {
  constructor(private prisma: PrismaService) {}

  async exportLeadsToExcel(filters: { from?: Date; to?: Date; status?: string }): Promise<Buffer> {
    const leads = await this.prisma.lead.findMany({
      where: {
        submittedAt: filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
        status: filters.status as any,
      },
      include: { product: true },
      orderBy: { submittedAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Leads');

    sheet.columns = [
      { header: 'Lead ID', key: 'leadCode', width: 22 },
      { header: 'Customer Name', key: 'customerName', width: 22 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Product', key: 'product', width: 25 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Executive', key: 'executive', width: 20 },
      { header: 'Submitted At', key: 'submittedAt', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    leads.forEach((lead) => {
      sheet.addRow({
        leadCode: lead.leadCode,
        customerName: lead.customerName,
        mobile: lead.mobile,
        product: lead.product?.title,
        state: lead.state,
        city: lead.city,
        status: lead.status,
        executive: lead.executiveNameSnapshot,
        submittedAt: lead.submittedAt.toISOString(),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportWalletStatementToExcel(userId: string): Promise<Buffer> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Wallet Statement');
    sheet.columns = [
      { header: 'Txn Code', key: 'txnCode', width: 25 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Date', key: 'createdAt', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    wallet?.transactions.forEach((t) => {
      sheet.addRow({
        txnCode: t.txnCode,
        type: t.type,
        amount: Number(t.amount),
        status: t.status,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
