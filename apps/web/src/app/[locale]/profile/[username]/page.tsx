import { ProfilePage } from '@/components/profile/ProfilePage';

interface Props { params: { username: string; locale: string }; }

export default function Profile({ params }: Props) {
  return <ProfilePage username={params.username} />;
}
