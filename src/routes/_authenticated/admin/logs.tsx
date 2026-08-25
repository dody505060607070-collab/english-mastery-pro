import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  User,
  Activity,
  FileDown
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
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  component: AdminLogs,
});

function AdminLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-activity-logs", actionFilter, dateRange],
    queryFn: async () => {
      // First get activity logs
      const { data: activities, error: activityError } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (activityError) throw activityError;

      // Then get all related profiles to avoid manual relationship errors
      const userIds = [...new Set(activities.map(log => log.user_id).filter(Boolean))];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds as string[]);

      if (profileError) throw profileError;

      // Join manually
      return activities.map(log => ({
        ...log,
        profiles: profiles?.find(p => p.id === log.user_id) || null
      }));
    },
  });

  const filteredLogs = logs?.filter(log => 
    log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.profiles?.phone?.includes(searchTerm) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    if (!filteredLogs) return;
    const headers = ["User", "Action", "Entity", "Date", "Metadata"];
    const rows = filteredLogs.map(log => [
      log.profiles?.full_name || "Unknown",
      log.action,
      log.entity_type,
      format(new Date(log.created_at!), "yyyy-MM-dd HH:mm"),
      JSON.stringify(log.metadata)
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `activity_logs_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
    toast.success("CSV file exported successfully");
  };

  const exportToPDF = () => {
    if (!filteredLogs) return;
    const doc = new jsPDF();
    const tableData = filteredLogs.map(log => [
      log.profiles?.full_name || "Unknown",
      log.action,
      log.entity_type,
      format(new Date(log.created_at!), "yyyy-MM-dd HH:mm")
    ]);

    autoTable(doc, {
      head: [["User", "Action", "Entity", "Date"]],
      body: tableData,
      styles: { font: "courier" },
    });
    doc.save(`activity_logs_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("PDF file exported successfully");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-['Outfit']" dir="ltr">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Activity Log</h1>
          <p className="text-muted-foreground text-sm">Track all operations performed by admins and users.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="rounded-xl gap-2 glass border-white/20" onClick={exportToCSV}>
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" className="rounded-xl gap-2 glass border-white/20" onClick={exportToPDF}>
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card className="glass border-white/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative col-span-1 md:col-span-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by user or action..." 
                className="pr-10 rounded-xl glass border-white/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="rounded-xl glass border-white/20">
                <Activity className="ml-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent className="glass border-white/20 font-['Outfit']">
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE_COURSE">Create Course</SelectItem>
                <SelectItem value="UPDATE_ROLE">Update Role</SelectItem>
                <SelectItem value="DELETE_USER">Delete User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="rounded-xl glass border-white/20">
                <Calendar className="ml-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent className="glass border-white/20 font-['Outfit']">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-white/20 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-white/10">
              <TableHead className="text-right">User</TableHead>
              <TableHead className="text-right">Action</TableHead>
              <TableHead className="text-right">Type</TableHead>
              <TableHead className="text-right">Date</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><div className="h-10 w-full bg-white/5 animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : filteredLogs?.map((log) => (
              <TableRow key={log.id} className="hover:bg-white/5 border-white/10 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold">{log.profiles?.full_name || "Unknown"}</span>
                    <span className="text-[10px] text-muted-foreground">{log.profiles?.phone}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.entity_type}</TableCell>
                <TableCell className="text-xs">
                  {log.created_at ? format(new Date(log.created_at), "yyyy/MM/dd HH:mm") : "-"}
                </TableCell>
                <TableCell className="max-w-[150px] truncate text-[10px] text-muted-foreground">
                  {log.metadata ? JSON.stringify(log.metadata) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
