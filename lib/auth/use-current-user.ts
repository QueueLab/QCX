import { useUser } from '@clerk/nextjs';

export function useCurrentUser() {
  const { user, isLoaded } = useUser();

  return {
    user: user || null,
    loading: !isLoaded
  };
}
