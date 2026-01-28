import { AutoScroller } from './scroller';
import { CaptureOptions } from '@/lib/types';

let scroller: AutoScroller | null = null;
let hookInjected = false;

// MAIN worldスクリプトを外部ファイルとして注入
function injectScript(): void {
  if (hookInjected) return;

  console.log('[X Bookmark Exporter][Content] Injecting MAIN world script...');

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected/main.js');
  script.type = 'text/javascript';

  script.onload = () => {
    console.log('[X Bookmark Exporter][Content] MAIN world script loaded');
    script.remove();
    hookInjected = true;
  };

  script.onerror = (e) => {
    console.error('[X Bookmark Exporter][Content] Failed to load MAIN world script:', e);
  };

  (document.head || document.documentElement).appendChild(script);
}

// ブックマークページの場合、キャプチャ状態を確認
if (window.location.pathname.includes('/i/bookmarks')) {
  chrome.runtime.sendMessage({ type: 'GET_CAPTURE_STATUS' }, (response) => {
    if (response?.isCapturing && response?.options) {
      console.log('[X Bookmark Exporter][Content] Resuming capture after reload...');
      // hookを注入してスクロール開始
      injectScript();
      setTimeout(() => {
        scroller = new AutoScroller(response.options);
        scroller.start();
      }, 2000);
    }
  });
}

// MAIN worldからのメッセージを受信
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== 'X_BOOKMARK_EXPORTER_DATA') return;

  console.log('[X Bookmark Exporter][Content] Received message from MAIN world');
  console.log('[X Bookmark Exporter][Content] Posts count:', event.data.payload?.posts?.length);

  // Service Workerに転送
  chrome.runtime.sendMessage({
    type: 'BOOKMARKS_RECEIVED',
    payload: event.data.payload,
  }, (response) => {
    console.log('[X Bookmark Exporter][Content] Service Worker response:', response);
  });
});

// Service Workerからのコマンドを受信
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[X Bookmark Exporter][Content] Received message from SW:', message.type);

  switch (message.type) {
    case 'START_CAPTURE':
      startCapture(message.payload);
      sendResponse({ success: true });
      break;
    case 'STOP_CAPTURE':
      stopCapture();
      sendResponse({ success: true });
      break;
  }
  return true;
});

async function startCapture(options: CaptureOptions) {
  console.log('[X Bookmark Exporter][Content] Starting capture with options:', options);

  // ブックマークページでない場合は移動
  if (!window.location.pathname.includes('/i/bookmarks')) {
    console.log('[X Bookmark Exporter][Content] Navigating to bookmarks page...');
    window.location.href = 'https://x.com/i/bookmarks';
    return;
  }

  // hookを注入してリロード（リロード後にキャプチャ再開）
  console.log('[X Bookmark Exporter][Content] Reloading to fetch bookmarks...');
  window.location.reload();
}

function stopCapture() {
  console.log('[X Bookmark Exporter][Content] Stopping capture...');
  scroller?.stop();
  scroller = null;
}

console.log('[X Bookmark Exporter][Content] Content script loaded');
