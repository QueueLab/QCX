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
import { addUser } from '@/lib/actions/users';
import type { SettingsFormValues } from './settings';

interface UserManagementFormProps {
  form: UseFormReturn<SettingsFormValues>;
}

export function UserManagementForm({ form }: UserManagementFormProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "users",
  });
  const { toast } = useToast();
  const [isAddingUser, setIsAddingUser] = useState(false);

  // const watchNewUserEmail = form.watch("newUserEmail", ""); // Not strictly needed for logic below
  // const watchNewUserRole = form.watch("newUserRole", "viewer"); // Not strictly needed for logic below

  const handleAddUser = async () => {
    setIsAddingUser(true);
    const newUserEmail = form.getValues("newUserEmail");
    const newUserRole = form.getValues("newUserRole") || "viewer"; // Ensure role has a default

    // Client-side validation first
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
    // Client-side check if user already exists in the local list
    if (fields.some(user => user.email === newUserEmail)) {
      form.setError("newUserEmail", { type: "manual", message: "User with this email already exists locally." });
      setIsAddingUser(false);
      return;
    }
    // Clear any previous local errors for newUserEmail if client checks pass
    form.clearErrors("newUserEmail");

    try {
      const result = await addUser('default-user', { email: newUserEmail, role: newUserRole });

      if (result.error) {
        toast({ title: 'Error adding user', description: result.error, variant: 'destructive' });
        form.setError("newUserEmail", { type: "manual", message: result.error }); // Show server error on field
      } else if (result.user) {
        toast({ title: 'User Added', description: `${result.user.email} was successfully added.` });
        append(result.user); // Add user with ID from server
        form.resetField("newUserEmail");
        form.resetField("newUserRole"); // Or set to default: form.setValue("newUserRole", "viewer");
        form.clearErrors("newUserEmail"); // Clear any previous errors
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
        <CardDescription>Add, remove, or edit user access and roles.</CardDescription>
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
              defaultValue="viewer"
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
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <Button type="button" onClick={handleAddUser} disabled={isAddingUser} className="mt-2">
             {isAddingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
             {isAddingUser ? "Adding..." : "Add User"}
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
                      <Button type="button" variant="ghost" size="icon" onClick={() => console.log('Edit user:', user.id)} className="mr-2">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
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
