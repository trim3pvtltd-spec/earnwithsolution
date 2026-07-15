import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminContentService {
  constructor(private prisma: PrismaService) {}

  // --- Banners ---
  getBanners() {
    return this.prisma.banner.findMany({ orderBy: { displayOrder: 'asc' } });
  }
  createBanner(data: any) {
    return this.prisma.banner.create({ data });
  }
  updateBanner(id: string, data: any) {
    return this.prisma.banner.update({ where: { id }, data });
  }
  deleteBanner(id: string) {
    return this.prisma.banner.delete({ where: { id } });
  }

  // --- Announcements ---
  getAnnouncements() {
    return this.prisma.announcement.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  }
  createAnnouncement(title: string, body: string) {
    return this.prisma.announcement.create({ data: { title, body } });
  }
  updateAnnouncement(id: string, data: any) {
    return this.prisma.announcement.update({ where: { id }, data });
  }

  // --- Training videos ---
  getTrainingVideos() {
    return this.prisma.trainingVideo.findMany({ orderBy: { createdAt: 'desc' } });
  }
  createTrainingVideo(data: any) {
    return this.prisma.trainingVideo.create({ data });
  }
  updateTrainingVideo(id: string, data: any) {
    return this.prisma.trainingVideo.update({ where: { id }, data });
  }
  deleteTrainingVideo(id: string) {
    return this.prisma.trainingVideo.delete({ where: { id } });
  }
  trackProgress(userId: string, trainingVideoId: string, watchedSeconds: number, completed: boolean) {
    return this.prisma.trainingProgress.upsert({
      where: { userId_trainingVideoId: { userId, trainingVideoId } },
      update: { watchedSeconds, completed },
      create: { userId, trainingVideoId, watchedSeconds, completed },
    });
  }

  // --- Support tickets ---
  getTickets(status?: string) {
    return this.prisma.supportTicket.findMany({
      where: status ? { status } : {},
      include: { user: { select: { fullName: true, mobile: true } }, replies: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  createTicket(userId: string, subject: string, message: string) {
    const ticketCode = `EWS-TKT-${Date.now()}`;
    return this.prisma.supportTicket.create({ data: { ticketCode, userId, subject, message } });
  }
  replyTicket(ticketId: string, repliedById: string, isAdmin: boolean, message: string) {
    return this.prisma.supportReply.create({ data: { ticketId, repliedById, isAdmin, message } });
  }
  updateTicketStatus(ticketId: string, status: string) {
    return this.prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
  }
}
