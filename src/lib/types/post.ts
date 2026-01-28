export interface Post {
  id: string;
  text: string;
  createdAt: string; // ISO 8601
  username: string; // @なし
  displayName: string;
  url: string;
  metrics: {
    likes: number;
    reposts: number;
    replies: number;
    bookmarks: number;
  };
  media: Media[];
}

export interface Media {
  type: 'photo' | 'video' | 'animated_gif';
  url: string;
  thumbnail: string;
}
