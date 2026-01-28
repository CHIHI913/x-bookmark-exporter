import { store } from '@/lib/store';
import { exportToCsv, exportToMarkdown } from '@/lib/exporter';
import { CaptureState } from './state';
import { Post, CaptureOptions } from '@/lib/types';

console.log('[X Bookmark Exporter][SW] Service Worker starting...');

// 状態管理
const state = new CaptureState();

// メッセージハンドラ登録
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[X Bookmark Exporter][SW] Received message:', message.type, message.payload);
  handleMessage(message, sender, sendResponse);
  return true; // 非同期レスポンスを許可
});

// インストール時の初期化
chrome.runtime.onInstalled.addListener(() => {
  console.log('[X Bookmark Exporter][SW] Extension installed');
});

async function handleMessage(
  message: { type: string; payload?: unknown },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    switch (message.type) {
      case 'BOOKMARKS_RECEIVED':
        console.log('[X Bookmark Exporter][SW] Processing BOOKMARKS_RECEIVED');
        await handleBookmarksReceived(message.payload as { posts: Post[] });
        sendResponse({ success: true });
        break;

      case 'START_CAPTURE':
        console.log('[X Bookmark Exporter][SW] Processing START_CAPTURE');
        await handleStartCapture(message.payload as CaptureOptions);
        sendResponse({ success: true });
        break;

      case 'STOP_CAPTURE':
        console.log('[X Bookmark Exporter][SW] Processing STOP_CAPTURE');
        state.stopCapture();
        sendResponse({ success: true });
        break;

      case 'CAPTURE_STARTED':
        console.log('[X Bookmark Exporter][SW] Processing CAPTURE_STARTED');
        // Content Scriptからの通知
        sendResponse({ success: true });
        break;

      case 'CAPTURE_COMPLETED':
        console.log('[X Bookmark Exporter][SW] Processing CAPTURE_COMPLETED');
        state.stopCapture();
        // Popupに完了通知
        chrome.runtime
          .sendMessage({
            type: 'CAPTURE_COMPLETED',
            payload: state.getStatus(),
          })
          .catch(() => {}); // Popupが閉じている場合は無視
        sendResponse({ success: true });
        break;

      case 'GET_CAPTURE_STATUS':
        const status = state.getStatus();
        console.log('[X Bookmark Exporter][SW] GET_CAPTURE_STATUS response:', status);
        sendResponse(status);
        break;

      case 'GET_BOOKMARKS':
        const bookmarks = store.getAllBookmarks();
        sendResponse({ bookmarks });
        break;

      case 'EXPORT':
        await handleExport(message.payload as { format: 'csv' | 'markdown' }, sendResponse);
        break;

      case 'CLEAR_DATA':
        store.clear();
        state.reset();
        sendResponse({ success: true });
        break;

      default:
        console.log('[X Bookmark Exporter][SW] Unknown message type:', message.type);
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('[X Bookmark Exporter][SW] Error handling message:', error);
    sendResponse({ error: String(error) });
  }
}

const DEFAULT_COUNT = 20;

async function handleBookmarksReceived(payload: { posts: Post[] }): Promise<void> {
  let { posts } = payload;
  console.log('[X Bookmark Exporter][SW] Received posts count:', posts?.length);

  if (!posts || posts.length === 0) {
    console.log('[X Bookmark Exporter][SW] No posts to save');
    return;
  }

  // 件数制限を適用（デフォルト10件）
  const options = state.getOptions();
  const targetCount = (options?.mode === 'count' && options.count) ? options.count : DEFAULT_COUNT;
  const currentCount = store.getCount();
  const remaining = targetCount - currentCount;

  if (remaining <= 0) {
    console.log('[X Bookmark Exporter][SW] Target count reached, skipping');
    return;
  }

  if (posts.length > remaining) {
    posts = posts.slice(0, remaining);
    console.log('[X Bookmark Exporter][SW] Limited to:', posts.length);
  }

  // 重複を除いて保存
  const newPosts = store.addBookmarks(posts);
  console.log('[X Bookmark Exporter][SW] New posts saved:', newPosts.length);

  // 状態更新
  state.addCaptured(newPosts.length);

  const currentStatus = state.getStatus();
  console.log('[X Bookmark Exporter][SW] Current status after save:', currentStatus);

  // Popupに進捗通知
  chrome.runtime
    .sendMessage({
      type: 'CAPTURE_PROGRESS',
      payload: currentStatus,
    })
    .catch(() => {}); // Popupが閉じている場合は無視
}

async function handleStartCapture(options: CaptureOptions): Promise<void> {
  console.log('[X Bookmark Exporter][SW] Starting capture with options:', options);
  state.startCapture(options);

  // アクティブタブにキャプチャ開始を指示
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log('[X Bookmark Exporter][SW] Active tab:', tab?.id, tab?.url);

  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE', payload: options }, (response) => {
      console.log('[X Bookmark Exporter][SW] START_CAPTURE response from content:', response);
    });
  } else {
    console.log('[X Bookmark Exporter][SW] No active tab found');
  }
}

async function handleExport(
  payload: { format: 'csv' | 'markdown' },
  sendResponse: (response: unknown) => void
): Promise<void> {
  const bookmarks = store.getAllBookmarks();

  if (payload.format === 'csv') {
    // CSVはファイルダウンロード
    const content = exportToCsv(bookmarks);
    const filename = `x-bookmarks-${Date.now()}.csv`;
    const mimeType = 'text/csv;charset=utf-8';
    const dataUrl = `data:${mimeType},${encodeURIComponent(content)}`;

    await chrome.downloads.download({
      url: dataUrl,
      filename,
      saveAs: true,
    });

    sendResponse({ success: true, filename });
  } else {
    // Markdownはクリップボードにコピー（Popup側で処理）
    const content = exportToMarkdown(bookmarks);
    sendResponse({ success: true, clipboard: true, content, count: bookmarks.length });
  }
}
