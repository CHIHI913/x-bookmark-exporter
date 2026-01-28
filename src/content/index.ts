import { AutoScroller } from './scroller';
import { CaptureOptions } from '@/lib/types';

// MAIN worldスクリプトを外部ファイルとして注入
function injectScript(): void {
  console.log('[X Bookmark Exporter][Content] Injecting MAIN world script...');

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected/main.js');
  script.type = 'text/javascript';

  script.onload = () => {
    console.log('[X Bookmark Exporter][Content] MAIN world script loaded');
    script.remove();
  };

  script.onerror = (e) => {
    console.error('[X Bookmark Exporter][Content] Failed to load MAIN world script:', e);
  };

  // document_startで実行されるため、documentElementに追加
  (document.head || document.documentElement).appendChild(script);
}

injectScript();
console.log('[X Bookmark Exporter][Content] Content script initialized');

// ブックマークページの場合、読み込み時にデータをクリア
if (window.location.pathname.includes('/i/bookmarks')) {
  chrome.runtime.sendMessage({ type: 'CLEAR_DATA' }, () => {
    console.log('[X Bookmark Exporter][Content] Data cleared on page load');
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

let scroller: AutoScroller | null = null;

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

  // ブックマークページに移動（必要な場合）
  if (!window.location.pathname.includes('/i/bookmarks')) {
    console.log('[X Bookmark Exporter][Content] Navigating to bookmarks page...');
    window.location.href = 'https://x.com/i/bookmarks';
    return;
  }

  // 自動スクロール開始
  scroller = new AutoScroller(options);
  await scroller.start();
}

function stopCapture() {
  console.log('[X Bookmark Exporter][Content] Stopping capture...');
  scroller?.stop();
  scroller = null;
}

console.log('[X Bookmark Exporter][Content] Content script loaded');
