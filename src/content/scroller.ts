import { CaptureOptions } from '@/lib/types';

export class AutoScroller {
  private options: CaptureOptions;
  private isRunning = false;

  constructor(options: CaptureOptions) {
    this.options = options;
    console.log('[X Bookmark Exporter][Scroller] Created with options:', options);
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.log('[X Bookmark Exporter][Scroller] Starting...');

    // Service Workerに開始を通知
    chrome.runtime.sendMessage({ type: 'CAPTURE_STARTED' });

    let scrollCount = 0;
    while (this.isRunning) {
      const previousHeight = document.body.scrollHeight;
      scrollCount++;

      console.log(`[X Bookmark Exporter][Scroller] Scroll #${scrollCount}, height: ${previousHeight}`);

      // スクロール
      window.scrollTo(0, document.body.scrollHeight);

      // レート制限対策（1.5秒待機）
      await this.delay(1500);

      // 終了条件チェック
      const shouldStop = await this.shouldStop(previousHeight);
      console.log(`[X Bookmark Exporter][Scroller] Should stop: ${shouldStop}`);

      if (shouldStop) {
        break;
      }
    }

    console.log('[X Bookmark Exporter][Scroller] Completed after', scrollCount, 'scrolls');

    // Service Workerに完了を通知
    chrome.runtime.sendMessage({ type: 'CAPTURE_COMPLETED' });
  }

  stop(): void {
    console.log('[X Bookmark Exporter][Scroller] Stopping...');
    this.isRunning = false;
  }

  private async shouldStop(previousHeight: number): Promise<boolean> {
    const currentHeight = document.body.scrollHeight;

    console.log(`[X Bookmark Exporter][Scroller] Height check: previous=${previousHeight}, current=${currentHeight}`);

    // スクロールが進まない = 末尾到達
    if (currentHeight === previousHeight) {
      console.log('[X Bookmark Exporter][Scroller] End of page reached');
      return true;
    }

    // 現在の取得状況を確認
    const status = await this.getStatus();
    console.log('[X Bookmark Exporter][Scroller] Current status:', status);

    // 件数制限チェック
    if (this.options.mode === 'count' && this.options.count) {
      console.log(`[X Bookmark Exporter][Scroller] Count check: ${status.count} / ${this.options.count}`);
      if (status.count >= this.options.count) {
        console.log('[X Bookmark Exporter][Scroller] Count limit reached');
        return true;
      }
    }

    // 期間制限チェック
    if (this.options.mode === 'period' && this.options.startDate && status.oldestDate) {
      const oldestDate = new Date(status.oldestDate);
      const startDate = new Date(this.options.startDate);
      console.log(`[X Bookmark Exporter][Scroller] Date check: oldest=${oldestDate.toISOString()}, start=${startDate.toISOString()}`);
      if (oldestDate < startDate) {
        console.log('[X Bookmark Exporter][Scroller] Date limit reached');
        return true;
      }
    }

    return false;
  }

  private getStatus(): Promise<{ count: number; oldestDate: string | null }> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_CAPTURE_STATUS' }, (response) => {
        console.log('[X Bookmark Exporter][Scroller] GET_CAPTURE_STATUS response:', response);
        resolve(response);
      });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
