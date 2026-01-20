// File: components/settings/components/user-management-form.tsx
import React, { useState } from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Trash2, Edit3, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/hooks/use-toast';
import { inviteUserToChat } from '@/lib/actions/collaboration';
import type { SettingsFormValues } from './settings';

interface UserManagementFormProps {
  form: UseFormReturn<SettingsFormValues>;
  chatId: string;
}

export function UserManagementForm({ form, chatId }: UserManagementFormProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "users",
  });
  const { toast } = useToast();
  const [isAddingUser, setIsAddingUser] = useState(false);

  const handleAddUser = async () => {
    setIsAddingUser(true);
    const newUserEmail = form.getValues("newUserEmail");
    const newUserRole = form.getValues("newUserRole") as 'owner' | 'collaborator';

    if (!newUserEmail) {
      form.setError("newUserEmail", { type: "manual", message: "Email is required." });
      setIsAddingUser(false);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail)) {
      form.setError("newUserEmail", { type: "manual", message: "Invalid email address." });
      setIsAddingUser(false);
      return;
    }

    form.clearErrors("newUserEmail");

    try {
      const result = await inviteUserToChat(chatId, newUserEmail, newUserRole);

      if (result.error) {
        toast({ title: 'Error adding user', description: result.error, variant: 'destructive' });
        form.setError("newUserEmail", { type: "manual", message: result.error });
      } else {
        toast({ title: 'User Invited', description: `${newUserEmail} was successfully invited.` });
        // We don't append here because the user needs to accept the invite.
        // We can add a "pending invitations" section in the future.
        form.resetField("newUserEmail");
        form.resetField("newUserRole");
        form.clearErrors("newUserEmail");
      }
    } catch (error) {
      console.error("Failed to add user:", error);
      toast({ title: 'Error', description: 'An unexpected error occurred. Please try again.', variant: 'destructive' });
    } finally {
      setIsAddingUser(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Invite users to collaborate on this chat.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-lg font-medium">Add New User</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <FormField
              control={form.control}
              name="newUserEmail"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="user@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newUserRole"
              defaultValue="collaborator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="collaborator">Collaborator</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <Button type="button" onClick={handleAddUser} disabled={isAddingUser} className="mt-2">
             {isAddingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
             {isAddingUser ? "Inviting..." : "Invite User"}
           </Button>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-medium">Current Users</h4>
          {fields.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => console.log('Edit user:', user.id)} className="mr-2">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No users have been added yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
