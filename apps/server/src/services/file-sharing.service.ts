import crypto from 'crypto';
import { SharedFileRecord, ISharedFileRecordDocument } from '../models/SharedFileRecord';
import {
  RegisterSharedFileInput,
  SharedFileCategory,
  SharedFileScope,
  SharedFileSummary,
  StorageQuotaSummary,
} from '@infernux/shared';

const DEFAULT_USER_QUOTA_BYTES = 100 * 1024 * 1024; // 100 MB per user

export class FileSharingService {
  private inferCategory(mimeType: string): SharedFileCategory {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip')) {
      return 'archive';
    }
    return 'document';
  }

  private formatRecord(doc: ISharedFileRecordDocument): SharedFileSummary {
    const owner = doc.ownerId as any;
    const ownerId = owner?._id?.toString() || owner?.toString() || '';
    const isExpired = Boolean(doc.expiresAt && doc.expiresAt.getTime() < Date.now());
    return {
      id: doc._id.toString(),
      ownerId,
      owner: owner?.username
        ? {
            id: ownerId,
            username: owner.username,
            displayName: owner.displayName || '',
            avatarUrl: owner.avatarUrl,
            isVerified: owner.isVerified,
          }
        : undefined,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSizeBytes: doc.fileSizeBytes,
      fileUrl: isExpired ? '' : doc.fileUrl,
      previewUrl: doc.previewUrl,
      category: doc.category,
      scope: doc.scope,
      scopeId: doc.scopeId,
      shareToken: doc.shareToken,
      expiresAt: doc.expiresAt?.toISOString(),
      isExpired,
      downloadsCount: doc.downloadsCount,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  async getQuota(userId: string): Promise<StorageQuotaSummary> {
    const records = await SharedFileRecord.find({ ownerId: userId }).select('fileSizeBytes');
    const usedBytes = records.reduce((acc, r) => acc + (r.fileSizeBytes || 0), 0);
    return {
      usedBytes,
      quotaBytes: DEFAULT_USER_QUOTA_BYTES,
      filesCount: records.length,
      percentUsed: Number(((usedBytes / DEFAULT_USER_QUOTA_BYTES) * 100).toFixed(2)),
    };
  }

  async registerFile(userId: string, input: RegisterSharedFileInput): Promise<SharedFileSummary> {
    const quota = await this.getQuota(userId);
    if (quota.usedBytes + input.fileSizeBytes > quota.quotaBytes) {
      throw new Error('Storage quota exceeded (100 MB per user limit)');
    }

    const shareToken = crypto.randomBytes(12).toString('hex');
    const expiresAt =
      typeof input.expiresInHours === 'number'
        ? new Date(Date.now() + input.expiresInHours * 3600 * 1000)
        : undefined;

    const record = new SharedFileRecord({
      ownerId: userId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      fileUrl: input.fileUrl,
      previewUrl: input.previewUrl,
      category: this.inferCategory(input.mimeType),
      scope: input.scope,
      scopeId: input.scopeId,
      shareToken,
      expiresAt,
    });
    await record.save();
    await record.populate('ownerId', 'username displayName avatarUrl isVerified');
    return this.formatRecord(record);
  }

  async listFiles(
    userId: string,
    scope?: SharedFileScope,
    scopeId?: string
  ): Promise<SharedFileSummary[]> {
    const filter: any = scope ? { scope } : { ownerId: userId };
    if (scope === 'personal') filter.ownerId = userId;
    if (scopeId) filter.scopeId = scopeId;

    const docs = await SharedFileRecord.find(filter)
      .populate('ownerId', 'username displayName avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .limit(80);
    return docs.map((d) => this.formatRecord(d));
  }

  async accessByShareToken(token: string): Promise<SharedFileSummary> {
    const doc = await SharedFileRecord.findOne({ shareToken: token }).populate(
      'ownerId',
      'username displayName avatarUrl isVerified'
    );
    if (!doc) throw new Error('Shared file link not found');
    if (doc.expiresAt && doc.expiresAt.getTime() < Date.now()) {
      throw new Error('Shared file link has expired');
    }
    doc.downloadsCount += 1;
    await doc.save();
    return this.formatRecord(doc);
  }

  async deleteFile(userId: string, fileId: string): Promise<{ deleted: boolean }> {
    const doc = await SharedFileRecord.findById(fileId);
    if (!doc) throw new Error('Shared file not found');
    if (doc.ownerId.toString() !== userId) {
      throw new Error('Only the owner can delete this shared file');
    }
    await SharedFileRecord.findByIdAndDelete(fileId);
    return { deleted: true };
  }
}

export const fileSharingService = new FileSharingService();
