import Dexie, { Table } from 'dexie';
import { Post } from '@/lib/types';

class BookmarkDatabase extends Dexie {
  bookmarks!: Table<Post>;

  constructor() {
    super('x-bookmark-exporter');

    this.version(1).stores({
      bookmarks: 'id, createdAt, username',
    });
  }

  async init(): Promise<void> {
    await this.open();
    console.log('[X Bookmark Exporter] Database initialized');
  }

  async upsertBookmarks(posts: Post[]): Promise<Post[]> {
    const existingIds = new Set((await this.bookmarks.toArray()).map((b) => b.id));

    const newPosts = posts.filter((p) => !existingIds.has(p.id));

    if (newPosts.length > 0) {
      await this.bookmarks.bulkPut(newPosts);
    }

    return newPosts;
  }

  async getAllBookmarks(options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<Post[]> {
    let collection = this.bookmarks.orderBy('createdAt').reverse();

    const posts = await collection.toArray();

    let filtered = posts;

    if (options?.startDate) {
      filtered = filtered.filter((b) => new Date(b.createdAt) >= new Date(options.startDate!));
    }

    if (options?.endDate) {
      filtered = filtered.filter((b) => new Date(b.createdAt) <= new Date(options.endDate!));
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  async getBookmarkCount(): Promise<number> {
    return this.bookmarks.count();
  }

  async getOldestBookmarkDate(): Promise<string | null> {
    const oldest = await this.bookmarks.orderBy('createdAt').first();
    return oldest?.createdAt ?? null;
  }

  async clearAll(): Promise<void> {
    await this.bookmarks.clear();
  }
}

export const db = new BookmarkDatabase();
