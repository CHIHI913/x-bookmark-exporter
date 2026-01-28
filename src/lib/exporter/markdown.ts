import { Post } from '@/lib/types';

export function exportToMarkdown(bookmarks: Post[]): string {
  const lines: string[] = [
    '# X Bookmarks',
    '',
    `エクスポート日時: ${new Date().toLocaleString('ja-JP')}`,
    `件数: ${bookmarks.length}`,
    '',
  ];

  for (const b of bookmarks) {
    lines.push(`## @${b.username} - ${b.displayName}`);
    lines.push('');
    lines.push(`> ${b.text.replace(/\n/g, '\n> ')}`);
    lines.push('');
    lines.push(`- 投稿日時: ${formatDate(b.createdAt)}`);
    lines.push(`- URL: ${b.url}`);
    lines.push(
      `- リポスト: ${b.metrics.reposts} / いいね: ${b.metrics.likes} / リプライ: ${b.metrics.replies}`
    );

    if (b.media.length > 0) {
      lines.push(`- メディア:`);
      for (const m of b.media) {
        lines.push(`  - [${m.type}](${m.url})`);
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
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
