import { store } from '@/lib/store';
import { exportToCsv, exportToMarkdown } from '@/lib/exporter';
import { Post, CaptureOptions } from '@/lib/types';

const DEFAULT_LIMIT = 10;
let targetCount: number | null = null; // 目標件数（FETCH_MORE時に設定）

// メッセージハンドラ登録
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true;
});

async function handleMessage(
  message: { type: string; payload?: unknown },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    switch (message.type) {
      case 'BOOKMARKS_RECEIVED':
        handleBookmarksReceived(message.payload as { posts: Post[] });
        sendResponse({ success: true });
        break;

      case 'GET_CAPTURE_STATUS':
        sendResponse({
          count: store.getCount(),
          oldestDate: store.getOldestDate(),
        });
        break;

      case 'FETCH_MORE':
        await handleFetchMore(message.payload as CaptureOptions);
        sendResponse({ success: true });
        break;

      case 'EXPORT':
        await handleExport(
          message.payload as { format: 'csv' | 'markdown'; options: CaptureOptions },
          sendResponse
        );
        break;

      case 'CLEAR_DATA':
        store.clear();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    sendResponse({ error: String(error) });
  }
}

function handleBookmarksReceived(payload: { posts: Post[] }): void {
  let { posts } = payload;
  if (!posts || posts.length === 0) return;

  // 件数制限を適用
  const limit = targetCount ?? DEFAULT_LIMIT;
  const currentCount = store.getCount();
  const remaining = limit - currentCount;

  if (remaining <= 0) return;

  if (posts.length > remaining) {
    posts = posts.slice(0, remaining);
  }

  const newCount = store.addBookmarks(posts).length;

  // Popupに進捗通知
  if (newCount > 0) {
    chrome.runtime
      .sendMessage({
        type: 'CAPTURE_PROGRESS',
        payload: { count: store.getCount(), oldestDate: store.getOldestDate() },
      })
      .catch(() => {});
  }
}

async function handleFetchMore(options: CaptureOptions): Promise<void> {
  // 目標件数を設定
  if (options.mode === 'count' && options.count) {
    targetCount = options.count;
  } else if (options.mode === 'all') {
    targetCount = 10000; // 全件取得の場合は大きな数を設定
  } else {
    targetCount = null;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'FETCH_MORE', payload: options });
  }
}

async function handleExport(
  payload: { format: 'csv' | 'markdown'; options: CaptureOptions },
  sendResponse: (response: unknown) => void
): Promise<void> {
  let bookmarks = store.getAllBookmarks();

  // オプションに基づいてフィルタリング
  const { options } = payload;
  if (options) {
    if (options.mode === 'count' && options.count) {
      bookmarks = bookmarks.slice(0, options.count);
    } else if (options.mode === 'period' && options.startDate) {
      const start = new Date(options.startDate);
      const end = options.endDate ? new Date(options.endDate) : new Date();
      bookmarks = bookmarks.filter((b) => {
        const date = new Date(b.createdAt);
        return date >= start && date <= end;
      });
    }
    // mode === 'all' の場合はフィルタリングなし
  }

  if (payload.format === 'csv') {
    const content = exportToCsv(bookmarks);
    const filename = `x-bookmarks-${Date.now()}.csv`;
    const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`;

    await chrome.downloads.download({ url: dataUrl, filename, saveAs: true });
    sendResponse({ success: true, filename });
  } else {
    const content = exportToMarkdown(bookmarks);
    sendResponse({ success: true, clipboard: true, content, count: bookmarks.length });
  }
}
