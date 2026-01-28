import { CaptureOptions } from '@/lib/types';

export class AutoScroller {
  private options: CaptureOptions;
  private isRunning = false;

  constructor(options: CaptureOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    this.isRunning = true;

    // Service Workerに開始を通知
    chrome.runtime.sendMessage({ type: 'CAPTURE_STARTED' });

    while (this.isRunning) {
      const previousHeight = document.body.scrollHeight;

      // スクロール
      window.scrollTo(0, document.body.scrollHeight);

      // レート制限対策（1.5秒待機）
      await this.delay(1500);

      // 終了条件チェック
      if (await this.shouldStop(previousHeight)) {
        break;
      }
    }

    // Service Workerに完了を通知
    chrome.runtime.sendMessage({ type: 'CAPTURE_COMPLETED' });
  }

  stop(): void {
    this.isRunning = false;
  }

  private async shouldStop(previousHeight: number): Promise<boolean> {
    const currentHeight = document.body.scrollHeight;

    // スクロールが進まない = 末尾到達
    if (currentHeight === previousHeight) {
      return true;
    }

    // 現在の取得状況を確認
    const status = await this.getStatus();

    // 件数制限チェック
    if (this.options.mode === 'count' && this.options.count) {
      if (status.count >= this.options.count) {
        return true;
      }
    }

    // 期間制限チェック
    if (this.options.mode === 'period' && this.options.startDate && status.oldestDate) {
      const oldestDate = new Date(status.oldestDate);
      const startDate = new Date(this.options.startDate);
      if (oldestDate < startDate) {
        return true;
      }
    }

    return false;
  }

  private getStatus(): Promise<{ count: number; oldestDate: string | null }> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_CAPTURE_STATUS' }, resolve);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
