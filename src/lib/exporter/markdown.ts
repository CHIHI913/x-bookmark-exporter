import { Post } from '@/lib/types';

export function exportToMarkdown(bookmarks: Post[]): string {
  const lines: string[] = [
    '# X Bookmarks',
    '',
    `エクスポート日時: ${new Date().toLocaleString('ja-JP')}`,
    `件数: ${bookmarks.length}`,
    '',
    '| ユーザーID | ユーザー名 | 本文 | 投稿日時 | URL | 引用元 | いいね | RT | imp |',
    '|------------|------------|------|----------|-----|--------|--------|-----|-----|',
  ];

  for (const b of bookmarks) {
    const userId = `@${b.username}`;
    const userName = escapeTable(b.displayName);
    const text = escapeTable(b.text);
    const date = formatDate(b.createdAt);
    const url = b.url;
    const quoted = b.quotedUrl ?? '';
    const likes = b.metrics.likes;
    const reposts = b.metrics.reposts;
    const views = b.metrics.views;

    lines.push(`| ${userId} | ${userName} | ${text} | ${date} | ${url} | ${quoted} | ${likes} | ${reposts} | ${views} |`);
  }

  return lines.join('\n');
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
