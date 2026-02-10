import { Post, QuotedPost, Media } from '@/lib/types';

const CSV_HEADERS = [
  'ユーザーID',
  'ユーザー名',
  '本文',
  'メディア',
  '投稿日時',
  'URL',
  '引用元',
  'いいね',
  'RT',
  'imp',
  '参照元',
];

export function exportToCsv(bookmarks: Post[]): string {
  const rows = [CSV_HEADERS.join(',')];

  for (const b of bookmarks) {
    rows.push(formatRow(b));
    let quoted = b.quoted;
    let parentUrl = b.url;
    while (quoted) {
      rows.push(formatQuotedRow(quoted, parentUrl));
      parentUrl = quoted.url;
      quoted = quoted.quoted;
    }
  }

  // BOM付きUTF-8
  return '\uFEFF' + rows.join('\n');
}

function formatRow(b: Post): string {
  return [
    b.username,
    escapeCSV(b.displayName),
    escapeCSV(b.text),
    formatMedia(b.media),
    b.createdAt,
    b.url,
    b.quoted?.url ?? '',
    b.metrics.likes,
    b.metrics.reposts,
    b.metrics.views,
    '',
  ].join(',');
}

function formatQuotedRow(q: QuotedPost, parentUrl: string): string {
  return [
    q.username,
    escapeCSV(q.displayName),
    escapeCSV(q.text),
    formatMedia(q.media),
    q.createdAt,
    q.url,
    q.quoted?.url ?? '',
    q.metrics.likes,
    q.metrics.reposts,
    q.metrics.views,
    parentUrl,
  ].join(',');
}

function formatMedia(media: Media[]): string {
  if (!media || media.length === 0) return '';
  return media.map(m => m.url).join(' ');
}

function escapeCSV(value: string): string {
  if (!value) return '""';
  const escaped = value.replace(/"/g, '""').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  return `"${escaped}"`;
}
