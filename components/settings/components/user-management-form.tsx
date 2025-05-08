"use client"

import { useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/hooks/use-toast"
import { Loader2, UserPlus, Trash2, Mail } from "lucide-react"
import { Label } from "@/components/ui/label"

interface UserManagementFormProps {
  form: UseFormReturn<any>
}

export function UserManagementForm({ form }: UserManagementFormProps) {
  const { toast } = useToast()
  const [newEmail, setNewEmail] = useState("")
  const [newRole, setNewRole] = useState("editor")
  const [isInviting, setIsInviting] = useState(false)

  const users = form.watch("users") || []

  const handleInviteUser = async () => {
    if (!newEmail) {
      toast({
        title: "Email required",
        description: "Please enter an email address to invite a user.",
        variant: "destructive",
      })
      return
    }

    setIsInviting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Add new user to the form state
      const newUser = {
        id: `user-${Date.now()}`,
        email: newEmail,
        role: newRole as "admin" | "editor" | "viewer",
      }

      form.setValue("users", [...users, newUser])

      // Clear form
      setNewEmail("")

      // Success notification
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${newEmail}.`,
      })
    } catch (error) {
      toast({
        title: "Failed to send invitation",
        description: "There was an error sending the invitation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveUser = (userId: string) => {
    const updatedUsers = users.filter((user: any) => user.id !== userId)
    form.setValue("users", updatedUsers)

    toast({
      title: "User removed",
      description: "The user has been removed from access.",
    })
  }

  const handleUpdateRole = (userId: string, newRole: string) => {
    const updatedUsers = users.map((user: any) => {
      if (user.id === userId) {
        return { ...user, role: newRole }
      }
      return user
    })

    form.setValue("users", updatedUsers)

    toast({
      title: "Role updated",
      description: "The user's role has been updated successfully.",
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Invite New Users</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                placeholder="user@example.com"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <Button type="button" onClick={handleInviteUser} disabled={isInviting || !newEmail}>
          {isInviting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Invitation...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Send Invitation
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Current Users</h3>
        {users.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="flex items-center">
                      <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Select value={user.role} onValueChange={(value: string) => handleUpdateRole(user.id, value)}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue>
                            <Badge
                              variant={
                                user.role === "admin" ? "default" : user.role === "editor" ? "secondary" : "outline"
                              }
                            >
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(user.id)}
                        className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove user</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-md border p-8 text-center text-muted-foreground">No users have been added yet.</div>
        )}
        <p className="text-sm text-muted-foreground">
          Admin users can modify all settings, Editors can modify content, and Viewers can only view the chatbot.
        </p>
      </div>
    </div>
  )
}
