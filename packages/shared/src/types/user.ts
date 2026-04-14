export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  preferredLang: 'he' | 'en';
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  createdAt: string;
}

export interface UserProfile extends User {
  isFollowing?: boolean;
  postCount: number;
}
