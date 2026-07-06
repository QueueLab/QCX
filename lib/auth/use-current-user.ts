import { useUser } from '@clerk/nextjs';

export function useCurrentUser() {
  const { user, isLoaded } = useUser();

  return {
    user: user ? { ...user, id: user.id } : null,
    loading: !isLoaded
  };
}
