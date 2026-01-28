import { Post } from '@/lib/types';

const CSV_HEADERS = [
  'id',
  'text',
  'username',
  'display_name',
  'created_at',
  'url',
  'quoted_url',
  'views',
  'likes',
  'reposts',
  'replies',
  'bookmarks',
  'media_urls',
];

export function exportToCsv(bookmarks: Post[]): string {
  const rows = [CSV_HEADERS.join(',')];

  for (const b of bookmarks) {
    const row = [
      b.id,
      escapeCSV(b.text),
      b.username,
      escapeCSV(b.displayName),
      b.createdAt,
      b.url,
      b.quotedUrl ?? '',
      b.metrics.views,
      b.metrics.likes,
      b.metrics.reposts,
      b.metrics.replies,
      b.metrics.bookmarks,
      escapeCSV(b.media.map((m) => m.url).join('|')),
    ];
    rows.push(row.join(','));
  }

  // BOM付きUTF-8
  return '\uFEFF' + rows.join('\n');
}

function escapeCSV(value: string): string {
  if (!value) return '""';
  const escaped = value.replace(/"/g, '""').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  return `"${escaped}"`;
}
