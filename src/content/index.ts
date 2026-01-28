import { AutoScroller } from './scroller';
import { CaptureOptions } from '@/lib/types';

// インラインでMAIN worldスクリプトを注入
function injectScript(): void {
  const scriptContent = `
(function() {
  // オリジナルのfetchをバックアップ
  const originalFetch = window.fetch;

  // Bookmarks APIのURLパターン
  const BOOKMARKS_API_PATTERN = /\\/graphql\\/.+\\/Bookmarks/;

  // fetchをオーバーライド
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    // URLを取得
    const url = args[0] instanceof Request ? args[0].url : String(args[0]);

    // Bookmarks APIの場合のみ処理
    if (BOOKMARKS_API_PATTERN.test(url)) {
      try {
        // レスポンスをクローン（元のレスポンスは消費しない）
        const clone = response.clone();
        const json = await clone.json();

        // ポストデータを抽出
        const posts = parseBookmarksResponse(json);

        if (posts.length > 0) {
          // Content Scriptに送信
          window.postMessage(
            {
              type: 'X_BOOKMARK_EXPORTER_DATA',
              payload: { posts, url },
            },
            '*'
          );

          console.log('[X Bookmark Exporter] ' + posts.length + ' posts captured');
        }
      } catch (error) {
        console.error('[X Bookmark Exporter] Parse error:', error);
      }
    }

    return response;
  };

  function parseBookmarksResponse(json) {
    const instructions = json.data?.bookmark_timeline_v2?.timeline?.instructions ?? [];
    const addEntriesInstruction = instructions.find(inst => inst.type === 'TimelineAddEntries');

    if (!addEntriesInstruction?.entries) {
      return [];
    }

    const posts = [];

    for (const entry of addEntriesInstruction.entries) {
      if (!entry.entryId?.startsWith('tweet-')) continue;

      const itemContent = entry.content?.itemContent;
      if (itemContent?.__typename !== 'TimelineTweet') continue;

      const postResult = itemContent.tweet_results?.result;
      if (!postResult) continue;

      const post = postResult.__typename === 'TweetWithVisibilityResults'
        ? postResult.tweet
        : postResult;

      if (post?.__typename === 'Tweet' && post.legacy) {
        const normalized = normalizePost(post);
        if (normalized) {
          posts.push(normalized);
        }
      }
    }

    return posts;
  }

  function normalizePost(raw) {
    try {
      const user = raw.core?.user_results?.result;
      const username = user?.core?.screen_name ?? '';

      return {
        id: raw.rest_id,
        text: raw.note_tweet?.note_tweet_results?.result?.text ?? raw.legacy.full_text,
        createdAt: new Date(raw.legacy.created_at).toISOString(),
        username,
        displayName: user?.core?.name ?? '',
        url: 'https://x.com/' + username + '/status/' + raw.rest_id,
        metrics: {
          likes: raw.legacy.favorite_count ?? 0,
          reposts: raw.legacy.retweet_count ?? 0,
          replies: raw.legacy.reply_count ?? 0,
          bookmarks: raw.legacy.bookmark_count ?? 0,
        },
        media: extractMedia(raw),
      };
    } catch (e) {
      console.error('[X Bookmark Exporter] Failed to normalize post:', e);
      return null;
    }
  }

  function extractMedia(post) {
    const mediaEntities = post.legacy?.extended_entities?.media ?? post.legacy?.entities?.media ?? [];
    return mediaEntities.map(m => ({
      type: m.type,
      url: m.type === 'video' || m.type === 'animated_gif'
        ? getBestVideoUrl(m.video_info?.variants)
        : m.media_url_https + '?format=jpg&name=orig',
      thumbnail: m.media_url_https,
    }));
  }

  function getBestVideoUrl(variants) {
    if (!variants?.length) return '';
    return variants
      .filter(v => v.bitrate !== undefined)
      .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0]?.url ?? '';
  }

  console.log('[X Bookmark Exporter] Fetch hook installed');
})();
`;

  const script = document.createElement('script');
  script.textContent = scriptContent;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

injectScript();

// MAIN worldからのメッセージを受信
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== 'X_BOOKMARK_EXPORTER_DATA') return;

  // Service Workerに転送
  chrome.runtime.sendMessage({
    type: 'BOOKMARKS_RECEIVED',
    payload: event.data.payload,
  });
});

let scroller: AutoScroller | null = null;

// Service Workerからのコマンドを受信
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
  // ブックマークページに移動（必要な場合）
  if (!window.location.pathname.includes('/i/bookmarks')) {
    window.location.href = 'https://x.com/i/bookmarks';
    return;
  }

  // 自動スクロール開始
  scroller = new AutoScroller(options);
  await scroller.start();
}

function stopCapture() {
  scroller?.stop();
  scroller = null;
}

console.log('[X Bookmark Exporter] Content script loaded');
