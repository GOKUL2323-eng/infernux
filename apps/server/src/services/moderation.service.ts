import { Report, IReportDocument } from '../models/Report';
import { CreateReportInput, ModerationReport } from '@infernux/shared';

export class ModerationService {
  async submitReport(reporterId: string, input: CreateReportInput): Promise<ModerationReport> {
    const report = new Report({
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      description: input.description,
    });
    await report.save();

    return {
      id: report._id.toString(),
      reporterId,
      targetType: report.targetType,
      targetId: report.targetId.toString(),
      reason: report.reason,
      description: report.description,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    };
  }
}

export const moderationService = new ModerationService();

