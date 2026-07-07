import { useUser } from '@clerk/nextjs';

export function useCurrentUser() {
  const { user, isLoaded } = useUser();

  // Map Clerk user to the structure expected by consumers if necessary
  // For now, we'll return a simplified version
  return {
    user: user ? {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      user_metadata: {
        name: user.fullName,
        avatar_url: user.imageUrl
      }
    } : null,
    loading: !isLoaded
  };
}
