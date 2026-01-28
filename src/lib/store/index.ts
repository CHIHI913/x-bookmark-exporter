import { Post } from '@/lib/types';

class BookmarkStore {
  private bookmarks: Map<string, Post> = new Map();

  clear(): void {
    this.bookmarks.clear();
  }

  addBookmarks(posts: Post[]): Post[] {
    const newPosts: Post[] = [];

    for (const post of posts) {
      if (!this.bookmarks.has(post.id)) {
        this.bookmarks.set(post.id, post);
        newPosts.push(post);
      }
    }

    return newPosts;
  }

  getAllBookmarks(): Post[] {
    const posts = Array.from(this.bookmarks.values());

    // sortIndex降順（大きい=新しいブックマーク）
    return posts.sort((a, b) => {
      const aSortIndex = a.sortIndex ?? '0';
      const bSortIndex = b.sortIndex ?? '0';
      return bSortIndex.localeCompare(aSortIndex);
    });
  }

  getCount(): number {
    return this.bookmarks.size;
  }

  getOldestDate(): string | null {
    if (this.bookmarks.size === 0) return null;

    const posts = Array.from(this.bookmarks.values());
    const oldest = posts.reduce((min, post) =>
      new Date(post.createdAt) < new Date(min.createdAt) ? post : min
    );

    return oldest.createdAt;
  }
}

export const store = new BookmarkStore();
