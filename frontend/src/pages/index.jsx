import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const role = user.role?.toLowerCase();
      if (role === 'caregiver') router.replace('/caregiver/dashboard');
      else router.replace('/patient/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, router]);

  return null;
}
