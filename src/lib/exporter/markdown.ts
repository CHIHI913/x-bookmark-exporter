import { Post, QuotedPost, Media } from '@/lib/types';

export function exportToMarkdown(bookmarks: Post[]): string {
  const lines: string[] = [
    '# X Bookmarks',
    '',
    `エクスポート日時: ${new Date().toLocaleString('ja-JP')}`,
    `件数: ${bookmarks.length}`,
    '',
    '| ユーザーID | ユーザー名 | 本文 | メディア | 投稿日時 | URL | 引用元 | いいね | RT | imp | 参照元 |',
    '|------------|------------|------|----------|----------|-----|--------|--------|-----|-----|--------|',
  ];

  for (const b of bookmarks) {
    lines.push(formatRow(b));
    // 引用元ポストを次の行に出力（再帰的にネスト展開）
    let quoted = b.quoted;
    let parentUrl = b.url;
    while (quoted) {
      lines.push(formatQuotedRow(quoted, parentUrl));
      parentUrl = quoted.url;
      quoted = quoted.quoted;
    }
  }

  return lines.join('\n');
}

function formatRow(b: Post): string {
  const userId = `@${b.username}`;
  const userName = escapeTable(b.displayName);
  const text = escapeTable(b.text);
  const date = formatDate(b.createdAt);
  const quotedUrl = b.quoted?.url ?? '';
  const mediaUrls = formatMedia(b.media);
  return `| ${userId} | ${userName} | ${text} | ${mediaUrls} | ${date} | ${b.url} | ${quotedUrl} | ${b.metrics.likes} | ${b.metrics.reposts} | ${b.metrics.views} |  |`;
}

function formatQuotedRow(q: QuotedPost, parentUrl: string): string {
  const userId = `@${q.username}`;
  const userName = escapeTable(q.displayName);
  const text = escapeTable(q.text);
  const date = formatDate(q.createdAt);
  const quotedUrl = q.quoted?.url ?? '';
  const mediaUrls = formatMedia(q.media);
  return `| ${userId} | ${userName} | ${text} | ${mediaUrls} | ${date} | ${q.url} | ${quotedUrl} | ${q.metrics.likes} | ${q.metrics.reposts} | ${q.metrics.views} | ${parentUrl} |`;
}

function formatMedia(media: Media[]): string {
  if (!media || media.length === 0) return '';
  return media.map(m => m.url).join(' ');
}

function escapeTable(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
