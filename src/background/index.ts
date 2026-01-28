import { db } from '@/lib/db';
import { exportToCsv, exportToMarkdown } from '@/lib/exporter';
import { CaptureState } from './state';
import { Post, CaptureOptions } from '@/lib/types';

// 状態管理
const state = new CaptureState();

// メッセージハンドラ登録
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // 非同期レスポンスを許可
});

// インストール時の初期化
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[X Bookmark Exporter] Extension installed');
  await db.init();
});

async function handleMessage(
  message: { type: string; payload?: unknown },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    switch (message.type) {
      case 'BOOKMARKS_RECEIVED':
        await handleBookmarksReceived(message.payload as { posts: Post[] });
        sendResponse({ success: true });
        break;

      case 'START_CAPTURE':
        await handleStartCapture(message.payload as CaptureOptions);
        sendResponse({ success: true });
        break;

      case 'STOP_CAPTURE':
        state.stopCapture();
        sendResponse({ success: true });
        break;

      case 'CAPTURE_STARTED':
        // Content Scriptからの通知
        sendResponse({ success: true });
        break;

      case 'CAPTURE_COMPLETED':
        state.stopCapture();
        // Popupに完了通知
        chrome.runtime
          .sendMessage({
            type: 'CAPTURE_COMPLETED',
            payload: await state.getStatus(),
          })
          .catch(() => {}); // Popupが閉じている場合は無視
        sendResponse({ success: true });
        break;

      case 'GET_CAPTURE_STATUS':
        const status = await state.getStatus();
        sendResponse(status);
        break;

      case 'GET_BOOKMARKS':
        const bookmarks = await db.getAllBookmarks(message.payload as { limit?: number });
        sendResponse({ bookmarks });
        break;

      case 'EXPORT':
        await handleExport(message.payload as { format: 'csv' | 'markdown' }, sendResponse);
        break;

      case 'CLEAR_DATA':
        await db.clearAll();
        state.reset();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('[X Bookmark Exporter] Error handling message:', error);
    sendResponse({ error: String(error) });
  }
}

async function handleBookmarksReceived(payload: { posts: Post[] }): Promise<void> {
  const { posts } = payload;

  // 重複を除いてDBに保存
  const newPosts = await db.upsertBookmarks(posts);

  // 状態更新
  state.addCaptured(newPosts.length);

  // Popupに進捗通知
  chrome.runtime
    .sendMessage({
      type: 'CAPTURE_PROGRESS',
      payload: await state.getStatus(),
    })
    .catch(() => {}); // Popupが閉じている場合は無視
}

async function handleStartCapture(options: CaptureOptions): Promise<void> {
  state.startCapture(options);

  // アクティブタブにキャプチャ開始を指示
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE', payload: options });
  }
}

async function handleExport(
  payload: { format: 'csv' | 'markdown' },
  sendResponse: (response: unknown) => void
): Promise<void> {
  const bookmarks = await db.getAllBookmarks();

  let content: string;
  let filename: string;
  let mimeType: string;

  if (payload.format === 'csv') {
    content = exportToCsv(bookmarks);
    filename = `x-bookmarks-${Date.now()}.csv`;
    mimeType = 'text/csv;charset=utf-8';
  } else {
    content = exportToMarkdown(bookmarks);
    filename = `x-bookmarks-${Date.now()}.md`;
    mimeType = 'text/markdown;charset=utf-8';
  }

  // データURLを生成
  const dataUrl = `data:${mimeType},${encodeURIComponent(content)}`;

  // ダウンロード
  await chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs: true,
  });

  sendResponse({ success: true, filename });
}
