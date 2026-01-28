export interface Post {
  id: string;
  text: string;
  createdAt: string; // ISO 8601 - 投稿日時
  sortIndex: string; // ブックマーク順序（大きい=新しい）
  username: string; // @なし
  displayName: string;
  url: string;
  quotedUrl?: string; // 引用元のURL
  metrics: {
    likes: number;
    reposts: number;
    replies: number;
    bookmarks: number;
    views: number;
  };
  media: Media[];
}

export interface Media {
  type: 'photo' | 'video' | 'animated_gif';
  url: string;
  thumbnail: string;
}
