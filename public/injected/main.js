// MAIN world script - fetch/XHR hook for intercepting X Bookmarks API
(function() {
  'use strict';

  // Bookmarks APIのURLパターン
  const BOOKMARKS_API_PATTERN = /\/graphql\/.+\/Bookmarks/;

  // ===== XMLHttpRequest フック =====
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._xbeUrl = url;
    return originalXHROpen.apply(this, [method, url, ...args]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    const xhr = this;
    const url = this._xbeUrl || '';

    // デバッグ: GraphQLリクエストをログ
    if (url.includes('/graphql/')) {
    }

    // Bookmarks APIの場合のみ処理
    if (BOOKMARKS_API_PATTERN.test(url)) {

      const originalOnReadyStateChange = xhr.onreadystatechange;

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
          try {
            const json = JSON.parse(xhr.responseText);

            const posts = parseBookmarksResponse(json);

            if (posts.length > 0) {
              window.postMessage(
                {
                  type: 'X_BOOKMARK_EXPORTER_DATA',
                  payload: { posts: posts, url: url },
                },
                '*'
              );
            } else {
            }
          } catch (error) {
          }
        }

        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.apply(this, arguments);
        }
      };
    }

    return originalXHRSend.apply(this, arguments);
  };


  // ===== fetch フック =====
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url = args[0] instanceof Request ? args[0].url : String(args[0]);

    if (url.includes('/graphql/')) {
    }

    if (BOOKMARKS_API_PATTERN.test(url)) {
      try {
        const clone = response.clone();
        const json = await clone.json();

        const posts = parseBookmarksResponse(json);

        if (posts.length > 0) {
          window.postMessage(
            {
              type: 'X_BOOKMARK_EXPORTER_DATA',
              payload: { posts: posts, url: url },
            },
            '*'
          );
        }
      } catch (error) {
      }
    }

    return response;
  };


  // ===== パーサー関数 =====
  function parseBookmarksResponse(json) {

    const instructions = json.data?.bookmark_timeline_v2?.timeline?.instructions ?? [];

    const addEntriesInstruction = instructions.find(function(inst) { return inst.type === 'TimelineAddEntries'; });

    if (!addEntriesInstruction?.entries) {
      return [];
    }


    const posts = [];

    for (const entry of addEntriesInstruction.entries) {
      if (!entry.entryId?.startsWith('tweet-')) {
        continue;
      }

      const itemContent = entry.content?.itemContent;

      if (itemContent?.__typename !== 'TimelineTweet') {
        continue;
      }

      const postResult = itemContent.tweet_results?.result;
      if (!postResult) {
        continue;
      }

      const post = postResult.__typename === 'TweetWithVisibilityResults'
        ? postResult.tweet
        : postResult;

      if (post?.__typename === 'Tweet' && post.legacy) {
        const sortIndex = entry.sortIndex || '0';
        const normalized = normalizePost(post, sortIndex);
        if (normalized) {
          posts.push(normalized);
        }
      }
    }

    return posts;
  }

  function normalizePost(raw, sortIndex) {
    try {
      const user = raw.core?.user_results?.result;
      const username = user?.core?.screen_name ?? '';

      // 引用元のURLを取得
      const quotedUrl = extractQuotedUrl(raw);

      return {
        id: raw.rest_id,
        text: raw.note_tweet?.note_tweet_results?.result?.text ?? raw.legacy.full_text,
        createdAt: new Date(raw.legacy.created_at).toISOString(),
        sortIndex: sortIndex,
        username: username,
        displayName: user?.core?.name ?? '',
        url: 'https://x.com/' + username + '/status/' + raw.rest_id,
        quotedUrl: quotedUrl,
        metrics: {
          likes: raw.legacy.favorite_count ?? 0,
          reposts: raw.legacy.retweet_count ?? 0,
          replies: raw.legacy.reply_count ?? 0,
          bookmarks: raw.legacy.bookmark_count ?? 0,
          views: parseInt(raw.views?.count ?? '0', 10),
        },
        media: extractMedia(raw),
      };
    } catch (e) {
      return null;
    }
  }

  function extractQuotedUrl(post) {
    try {
      const quoted = post.quoted_status_result?.result;
      if (!quoted) return null;

      // TweetWithVisibilityResultsの場合
      const quotedTweet = quoted.__typename === 'TweetWithVisibilityResults'
        ? quoted.tweet
        : quoted;

      if (!quotedTweet?.legacy || !quotedTweet?.core) return null;

      const quotedUser = quotedTweet.core?.user_results?.result;
      const quotedUsername = quotedUser?.core?.screen_name ?? quotedUser?.legacy?.screen_name;
      const quotedId = quotedTweet.rest_id;

      if (quotedUsername && quotedId) {
        return 'https://x.com/' + quotedUsername + '/status/' + quotedId;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function extractMedia(post) {
    const mediaEntities = post.legacy?.extended_entities?.media ?? post.legacy?.entities?.media ?? [];
    return mediaEntities.map(function(m) {
      return {
        type: m.type,
        url: m.type === 'video' || m.type === 'animated_gif'
          ? getBestVideoUrl(m.video_info?.variants)
          : m.media_url_https + '?format=jpg&name=orig',
        thumbnail: m.media_url_https,
      };
    });
  }

  function getBestVideoUrl(variants) {
    if (!variants?.length) return '';
    return variants
      .filter(function(v) { return v.bitrate !== undefined; })
      .sort(function(a, b) { return (b.bitrate ?? 0) - (a.bitrate ?? 0); })[0]?.url ?? '';
  }

})();
