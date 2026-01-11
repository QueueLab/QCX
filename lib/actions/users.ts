// File: lib/actions/users.ts
'use server';

import { revalidatePath } from 'next/cache';

// This is a placeholder for a database or other storage.
// In a real application, you would interact with your database here.

// Define UserRole and User types
export type UserRole = "admin" | "editor" | "viewer";

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

let usersStore: Record<string, Array<User>> = {
  'default-user': [ // Simulate a default user having some initial users
    { id: '1', email: 'admin@example.com', role: 'admin' },
    { id: '2', email: 'editor@example.com', role: 'editor' },
  ],
};

// Simulate a delay to mimic network latency
const simulateDBDelay = () => new Promise(resolve => setTimeout(resolve, 500));

export async function getUsers(userId: string = 'default-user'): Promise<{ users: User[] }> {
  await simulateDBDelay();
  if (!usersStore[userId]) {
    usersStore[userId] = [];
  }
  console.log(`[Action: getUsers] Fetched users for ${userId}:`, usersStore[userId]);
  return { users: usersStore[userId] };
}

export async function addUser(userId: string = 'default-user', newUser: { email: string; role: UserRole }): Promise<{ user?: User; error?: string }> {
  await simulateDBDelay();
  if (!usersStore[userId]) {
    usersStore[userId] = [];
  }

  // Check if user already exists (simple check, real DB would handle this better)
  if (usersStore[userId].some(user => user.email === newUser.email)) {
    console.warn(`[Action: addUser] User ${newUser.email} already exists for ${userId}`);
    return { error: 'User with this email already exists.' };
  }

  const userToAdd: User = { ...newUser, id: Math.random().toString(36).substr(2, 9) };
  usersStore[userId].push(userToAdd);
  console.log(`[Action: addUser] Added user ${newUser.email} for ${userId}:`, userToAdd);
  revalidatePath('/settings'); // Assuming settings page path, adjust if needed
  return { user: userToAdd };
}

export async function updateUserRole(userId: string = 'default-user', userEmail: string, newRole: UserRole): Promise<{ user?: User; error?: string }> {
  await simulateDBDelay();
  if (!usersStore[userId]) {
    return { error: 'User list not found.' };
  }

  const userIndex = usersStore[userId].findIndex(user => user.email === userEmail);
  if (userIndex === -1) {
    console.warn(`[Action: updateUserRole] User ${userEmail} not found for ${userId}`);
    return { error: 'User not found.' };
  }

  usersStore[userId][userIndex].role = newRole;
  console.log(`[Action: updateUserRole] Updated role for ${userEmail} to ${newRole} for ${userId}`);
  revalidatePath('/settings');
  return { user: usersStore[userId][userIndex] };
}

export async function removeUser(userId: string = 'default-user', userEmail: string): Promise<{ success?: boolean; error?: string }> {
  await simulateDBDelay();
  if (!usersStore[userId]) {
    return { error: 'User list not found.' };
  }

  const initialLength = usersStore[userId].length;
  usersStore[userId] = usersStore[userId].filter(user => user.email !== userEmail);

  if (usersStore[userId].length === initialLength) {
    console.warn(`[Action: removeUser] User ${userEmail} not found for ${userId}`);
    return { error: 'User not found.' };
  }

  console.log(`[Action: removeUser] Removed user ${userEmail} for ${userId}`);
  revalidatePath('/settings');
  return { success: true };
}

// Example of how the settings form might use these actions (conceptual)
export async function updateSettingsAndUsers(
  userId: string = 'default-user',
  formData: { users: Array<Omit<User, 'id'> & { id?: string }> } // Looser type for incoming, stricter for store
): Promise<{ success: boolean; message?: string; users?: User[] }> {
  // formData would contain systemPrompt, selectedModel, and the users array
  console.log('[Action: updateSettingsAndUsers] Received data:', formData);

  // Simulate saving systemPrompt and selectedModel
  // ... (logic for other settings)

  // For users, the frontend form already constructs the 'users' array.
  // Here, we could compare the incoming users list with the stored one
  // and make granular calls to addUser, updateUserRole, removeUser if needed,
  // or simply replace the user list if that's the desired behavior.
  // For simplicity in this simulation, let's assume the form sends the complete new user list.

  await simulateDBDelay();
  usersStore[userId] = formData.users.map((u): User => ({
    id: u.id || Math.random().toString(36).substr(2, 9),
    email: u.email,
    role: u.role, // Assumes u.role is already UserRole, validation should occur before this action
  }));

  console.log(`[Action: updateSettingsAndUsers] Updated users for ${userId}:`, usersStore[userId]);
  revalidatePath('/settings');
  return { success: true, message: 'Settings and users updated successfully.', users: usersStore[userId] };
}
