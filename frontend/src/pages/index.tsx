import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { isAuthenticated, getUser } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      const user = getUser();
      if (user?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="container">
      <div className="loading">Loading...</div>
    </div>
  );
}
