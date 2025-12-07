// /create - Mobile-friendly create post page

'use client';

import { useRouter } from 'next/navigation';
import CreatePostModal from '@/components/modal/CreatePostModal';

export default function CreatePage() {
  const router = useRouter();

  const handleClose = () => {
    // Go back or to feed
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/app/feed');
    }
  };

  const handlePostCreated = () => {
    // Dispatch event for feed refresh
    window.dispatchEvent(new CustomEvent('postCreated'));
    // Navigate to feed
    router.push('/app/feed');
  };

  return (
    <CreatePostModal
      isOpen={true}
      onClose={handleClose}
      onPostCreated={handlePostCreated}
      fullscreen
    />
  );
}
