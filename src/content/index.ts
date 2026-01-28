// MAIN worldスクリプトを外部ファイルとして注入
function injectScript(): void {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected/main.js');
  script.type = 'text/javascript';
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

// ブックマークページの場合のみhookを注入
if (window.location.pathname.includes('/i/bookmarks')) {
  injectScript();
}

// MAIN worldからのメッセージを受信してService Workerに転送
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== 'X_BOOKMARK_EXPORTER_DATA') return;

  chrome.runtime.sendMessage({
    type: 'BOOKMARKS_RECEIVED',
    payload: event.data.payload,
  });
});
