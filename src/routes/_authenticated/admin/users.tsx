import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, updateUserRole } from "@/utils/admin.functions";
import { 
  Users as UsersIcon, 
  Search, 
  MoreVertical, 
  ShieldCheck, 
  UserX, 
  UserCheck,
  Filter,
  ArrowUpDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getUsers(),
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { userId: string, role: any }) => updateUserRole({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role updated successfully");
    },
    onError: (err: any) => toast.error("Update failed: " + err.message)
  });

  const filteredUsers = users?.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm)
  );

  const getRoleBadge = (roles: any) => {
    const roleArr = Array.isArray(roles) ? roles : [];
    const role = roleArr[0]?.role || 'student';
    switch (role) {
      case 'admin': return <Badge className="bg-red-500 hover:bg-red-600">Admin</Badge>;
      case 'teacher': return <Badge className="bg-blue-500 hover:bg-blue-600">Teacher</Badge>;
      case 'editor': return <Badge className="bg-purple-500 hover:bg-purple-600">Editor</Badge>;
      default: return <Badge variant="outline">Student</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm">Manage student and staff accounts and their permissions.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or phone..." 
              className="pr-10 rounded-xl glass border-white/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="rounded-xl glass border-white/20 gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      <Card className="glass border-white/20 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-white/10">
              <TableHead className="text-right">User</TableHead>
              <TableHead className="text-right">Phone Number</TableHead>
              <TableHead className="text-right">Level</TableHead>
              <TableHead className="text-right">Role</TableHead>
              <TableHead className="text-right">Join Date</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><div className="h-10 w-full bg-white/5 animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : (filteredUsers as any[])?.map((user) => (
              <TableRow key={user.id} className="hover:bg-white/5 border-white/10 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                      {user.full_name?.[0] || 'U'}
                    </div>
                    <span className="font-medium">{user.full_name || "No name"}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{user.phone}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-bold">{user.level || "N/A"}</Badge>
                </TableCell>
                <TableCell>{getRoleBadge(user.user_roles)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString('ar-EG')}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass border-white/20 font-['Outfit']">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem onClick={() => roleMutation.mutate({ userId: user.id, role: 'admin' })}>
                        <ShieldCheck className="ml-2 h-4 w-4 text-red-500" />
                        Make Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => roleMutation.mutate({ userId: user.id, role: 'teacher' })}>
                        <ShieldCheck className="ml-2 h-4 w-4 text-blue-500" />
                        Make Teacher
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => roleMutation.mutate({ userId: user.id, role: 'student' })}>
                        <ShieldCheck className="ml-2 h-4 w-4" />
                        Make Student
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem className="text-red-500">
                        <UserX className="ml-2 h-4 w-4" />
                        Ban User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {(!filteredUsers || filteredUsers.length === 0) && !isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No users found with this name.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
