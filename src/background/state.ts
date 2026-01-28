import { db } from '@/lib/db';
import { CaptureOptions, CaptureStatus } from '@/lib/types';

export class CaptureState {
  private isCapturing = false;
  private capturedCount = 0;
  private options: CaptureOptions | null = null;

  startCapture(options: CaptureOptions): void {
    this.isCapturing = true;
    this.capturedCount = 0;
    this.options = options;
  }

  stopCapture(): void {
    this.isCapturing = false;
  }

  addCaptured(count: number): void {
    this.capturedCount += count;
  }

  reset(): void {
    this.isCapturing = false;
    this.capturedCount = 0;
    this.options = null;
  }

  async getStatus(): Promise<CaptureStatus> {
    const oldestDate = await db.getOldestBookmarkDate();
    const totalCount = await db.getBookmarkCount();

    return {
      isCapturing: this.isCapturing,
      count: totalCount,
      oldestDate,
      options: this.options,
    };
  }
}
