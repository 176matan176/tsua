import { PostDetailPage } from '@/components/posts/PostDetailPage';

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { id: string; locale: string } }) {
  return <PostDetailPage postId={params.id} />;
}
