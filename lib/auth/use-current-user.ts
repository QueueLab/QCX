import { useUser } from '@clerk/nextjs';

export function useCurrentUser() {
  const { user, isLoaded } = useUser();

  if (process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST === 'true') {
    return {
      user: {
        id: "mock-user-id",
        email: "mock_user@example.com",
        user_metadata: {
          name: "Mock User",
          avatar_url: ""
        }
      },
      loading: false
    };
  }

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
