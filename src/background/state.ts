import { store } from '@/lib/store';
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

  getOptions(): CaptureOptions | null {
    return this.options;
  }

  getCapturedCount(): number {
    return this.capturedCount;
  }

  isActive(): boolean {
    return this.isCapturing;
  }

  reset(): void {
    this.isCapturing = false;
    this.capturedCount = 0;
    this.options = null;
  }

  getStatus(): CaptureStatus {
    return {
      isCapturing: this.isCapturing,
      count: store.getCount(),
      oldestDate: store.getOldestDate(),
      options: this.options,
    };
  }
}
