import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Navbar from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Trash, Plus, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { createUserSchema, type CreateUser } from "@shared/schema";

export default function Users() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  // Form for creating new user
  const createForm = useForm<CreateUser>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      phone: "",
      role: "Analyst",
    },
  });

  // Form for editing user
  const editForm = useForm<CreateUser>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      phone: "",
      role: "Analyst",
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUser) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setIsAddDialogOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateUser> }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/users/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-gradient-to-r from-rose-100 to-red-100 text-rose-800 border border-rose-200";
      case "Manager":
        return "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200";
      case "Customer success officer":
        return "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200";
      case "Operations":
        return "bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border border-orange-200";
      case "Analyst":
        return "bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border border-purple-200";
      default:
        return "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800 border border-slate-200";
    }
  };

  const handleAddUser = () => {
    createForm.reset();
    createForm.setValue("role", "Analyst");
    setIsAddDialogOpen(true);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    editForm.reset({
      username: user.username,
      password: "", // Don't pre-fill password for security
      email: user.email,
      phone: user.phone,
      role: user.role,
    });
    editForm.setValue("role", user.role);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user: any) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const onSubmitCreate = (data: CreateUser) => {
    createUserMutation.mutate(data);
  };

  const onSubmitEdit = (data: CreateUser) => {
    if (selectedUser) {
      const updateData = { ...data };
      if (!updateData.password) {
        delete updateData.password;
      }
      updateUserMutation.mutate({ id: selectedUser.id, data: updateData });
    }
  };

  const onDeleteConfirm = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Navbar />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <i className="fas fa-users text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  User Management
                </h1>
                <p className="text-blue-600 mt-1">
                  Manage user accounts and role assignments
                </p>
              </div>
            </div>
            <Button 
              onClick={handleAddUser}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              data-testid="button-add-user"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>

          {/* Users Table */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 backdrop-blur-sm border border-slate-300 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-200 border-b border-slate-300">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-table text-white text-sm"></i>
                </div>
                <CardTitle className="text-xl font-bold text-slate-800">All Users</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {users?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-100 to-slate-200 border-b border-slate-300">
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 uppercase tracking-wide">Username</th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 uppercase tracking-wide">Email</th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 uppercase tracking-wide">Phone</th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 uppercase tracking-wide">Role</th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user: any) => (
                        <tr key={user.id} className="border-b border-slate-100 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200">
                          <td className="py-4 px-6">
                            <div className="font-medium text-slate-900">{user.username}</div>
                          </td>
                          <td className="py-4 px-6 text-slate-600">{user.email}</td>
                          <td className="py-4 px-6 text-slate-600">{user.phone}</td>
                          <td className="py-4 px-6">
                            <Badge className={`${getRoleColor(user.role)} px-3 py-1 font-semibold`}>{user.role}</Badge>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                className="bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-emerald-200 text-emerald-700 hover:text-emerald-800 shadow-sm hover:shadow-md transition-all duration-200"
                                data-testid={`button-edit-user-${user.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(user)}
                                className="bg-gradient-to-r from-rose-50 to-red-50 hover:from-rose-100 hover:to-red-100 border-rose-200 text-rose-700 hover:text-rose-800 shadow-sm hover:shadow-md transition-all duration-200"
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Plus className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-500">Add users to start managing access to the system.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mr-3">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold">Add New User</div>
                <div className="text-sm text-gray-500 font-normal">Create a new user account</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold text-gray-700">
                  Username <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="username"
                  {...createForm.register("username")}
                  placeholder="Enter username"
                  className="w-full"
                />
                {createForm.formState.errors.username && (
                  <p className="text-sm text-red-600">{createForm.formState.errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...createForm.register("email")}
                  placeholder="Enter email address"
                  className="w-full"
                />
                {createForm.formState.errors.email && (
                  <p className="text-sm text-red-600">{createForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  {...createForm.register("phone")}
                  placeholder="Enter phone number"
                  className="w-full"
                />
                {createForm.formState.errors.phone && (
                  <p className="text-sm text-red-600">{createForm.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-semibold text-gray-700">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select onValueChange={(value) => createForm.setValue("role", value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Customer success officer">Customer Success Officer</SelectItem>
                    <SelectItem value="Analyst">Analyst</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
                {createForm.formState.errors.role && (
                  <p className="text-sm text-red-600">{createForm.formState.errors.role.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...createForm.register("password")}
                  placeholder="Enter password"
                  className="w-full"
                />
                {createForm.formState.errors.password && (
                  <p className="text-sm text-red-600">{createForm.formState.errors.password.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="px-6"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUserMutation.isPending}
                className="px-6 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
              >
                {createUserMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mr-3">
                <Edit className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold">Edit User</div>
                <div className="text-sm text-gray-500 font-normal">{selectedUser?.username}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username" className="text-sm font-semibold text-gray-700">
                  Username <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-username"
                  {...editForm.register("username")}
                  placeholder="Enter username"
                  className="w-full"
                />
                {editForm.formState.errors.username && (
                  <p className="text-sm text-red-600">{editForm.formState.errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-sm font-semibold text-gray-700">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  {...editForm.register("email")}
                  placeholder="Enter email address"
                  className="w-full"
                />
                {editForm.formState.errors.email && (
                  <p className="text-sm text-red-600">{editForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="text-sm font-semibold text-gray-700">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-phone"
                  {...editForm.register("phone")}
                  placeholder="Enter phone number"
                  className="w-full"
                />
                {editForm.formState.errors.phone && (
                  <p className="text-sm text-red-600">{editForm.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role" className="text-sm font-semibold text-gray-700">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select onValueChange={(value) => editForm.setValue("role", value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Customer success officer">Customer Success Officer</SelectItem>
                    <SelectItem value="Analyst">Analyst</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
                {editForm.formState.errors.role && (
                  <p className="text-sm text-red-600">{editForm.formState.errors.role.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-password" className="text-sm font-semibold text-gray-700">
                  Password <span className="text-gray-500">(Leave blank to keep current)</span>
                </Label>
                <Input
                  id="edit-password"
                  type="password"
                  {...editForm.register("password")}
                  placeholder="Enter new password (optional)"
                  className="w-full"
                />
                {editForm.formState.errors.password && (
                  <p className="text-sm text-red-600">{editForm.formState.errors.password.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="px-6"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateUserMutation.isPending}
                className="px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                {updateUserMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update User
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <div className="w-10 h-10 bg-gradient-to-r from-rose-500 to-red-500 rounded-xl flex items-center justify-center mr-3">
                <Trash className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-rose-600">Delete User</div>
                <div className="text-sm text-gray-500 font-normal">This action cannot be undone</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
                <p className="text-gray-700">
                  Are you sure you want to delete the user <strong>{selectedUser.username}</strong>?
                </p>
                <p className="text-sm text-rose-600 mt-2">
                  This will permanently remove the user account and all associated data.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="px-6"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={onDeleteConfirm}
                  disabled={deleteUserMutation.isPending}
                  className="px-6 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white"
                >
                  {deleteUserMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash className="w-4 h-4 mr-2" />
                      Delete User
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
