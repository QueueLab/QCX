-- Add INSERT policy for authenticated users to create their own chats
-- This ensures users can only create chats where they are the owner
CREATE POLICY "Allow insert for authenticated users" 
ON "public"."chats" 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);
