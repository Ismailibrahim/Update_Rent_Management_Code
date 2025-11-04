"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditLogsApi, usersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Filter,
  RefreshCw,
  Search,
  Eye,
  Activity,
  Users,
  FileText,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  Database,
  MousePointerClick,
  Key,
  Edit,
} from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  model_type: string | null;
  model_id: number | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changes: Record<string, { old: any; new: any }> | null;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  route: string | null;
  method: string | null;
  url: string | null;
  response_status: number | null;
  execution_time: number | null;
  metadata: Record<string, any> | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

interface AuditStatistics {
  total_logs: number;
  by_action: Record<string, number>;
  top_users: Array<{
    user_id: number;
    user_name: string;
    count: number;
  }>;
  by_model: Array<{
    model_type: string;
    model_name: string;
    count: number;
  }>;
  daily_activity?: Record<string, number>;
  hourly_activity?: Record<string, number>;
  performance?: {
    avg_execution_time: number;
    max_execution_time: number;
    min_execution_time: number;
    slow_requests: number;
  };
  status_distribution?: Record<string, number>;
  error_rate?: number;
  day_of_week_activity?: Array<{
    day: string;
    count: number;
  }>;
  security?: {
    failed_logins: number;
    successful_logins: number;
    unique_ips: number;
  };
  change_frequency?: Array<{
    model_type: string;
    model_name: string;
    change_count: number;
  }>;
}

export default function AuditLogsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    user_id: "",
    action: "",
    model_type: "",
    model_id: "",
    start_date: "",
    end_date: "",
    search: "",
    recent_hours: "",
    exclude_auth: false,
    only_auth: false,
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 50,
    total: 0,
  });

  // Load audit logs
  const loadLogs = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current_page,
        per_page: pagination.per_page,
      };

      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.action) params.action = filters.action;
      if (filters.model_type) params.model_type = filters.model_type;
      if (filters.model_id) params.model_id = filters.model_id;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.search) params.search = filters.search;
      if (filters.recent_hours) params.recent_hours = filters.recent_hours;
      if (filters.exclude_auth) params.exclude_auth = true;
      if (filters.only_auth) params.only_auth = true;

      const response = await auditLogsApi.getAll(params);
      setLogs(response.data.data || []);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error: any) {
      console.error("Error loading audit logs:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const params: any = {};
      if (filters.start_date && filters.end_date) {
        params.start_date = filters.start_date;
        params.end_date = filters.end_date;
      }
      const response = await auditLogsApi.getStatistics(params);
      setStatistics(response.data);
    } catch (error: any) {
      console.error("Error loading statistics:", error);
    }
  };

  // Load users for filter
  const loadUsers = async () => {
    try {
      const response = await usersApi.getAll();
      const usersData = response.data?.data || response.data || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error("Error loading users:", error);
      setUsers([]); // Ensure it's always an array even on error
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadLogs();
    loadStatistics();
  }, [pagination.current_page, filters]);

  // Action type colors
  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      created: "bg-green-100 text-green-800",
      updated: "bg-blue-100 text-blue-800",
      deleted: "bg-red-100 text-red-800",
      restored: "bg-yellow-100 text-yellow-800",
      viewed: "bg-gray-100 text-gray-800",
      login: "bg-purple-100 text-purple-800",
      logout: "bg-orange-100 text-orange-800",
      login_failed: "bg-red-100 text-red-800",
      api_request: "bg-indigo-100 text-indigo-800",
    };
    return colors[action] || "bg-gray-100 text-gray-800";
  };

  // Action icons
  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return <CheckCircle className="h-4 w-4" />;
      case "updated":
        return <Edit className="h-4 w-4" />;
      case "deleted":
        return <XCircle className="h-4 w-4" />;
      case "viewed":
        return <Eye className="h-4 w-4" />;
      case "login":
      case "logout":
        return <Key className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Get model display name
  const getModelName = (modelType: string | null) => {
    if (!modelType) return "N/A";
    return modelType.split("\\").pop() || modelType;
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      user_id: "",
      action: "",
      model_type: "",
      model_id: "",
      start_date: "",
      end_date: "",
      search: "",
      recent_hours: "",
      exclude_auth: false,
      only_auth: false,
    });
    setPagination({ ...pagination, current_page: 1 });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Track all user activities and system changes
          </p>
        </div>
        <Button onClick={() => { loadLogs(); loadStatistics(); }} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {typeof statistics.total_logs === 'number'
                    ? statistics.total_logs.toLocaleString()
                    : Number(statistics.total_logs || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.by_action && typeof statistics.by_action === 'object'
                    ? Object.keys(statistics.by_action).length
                    : 0}
                </div>
                <p className="text-xs text-muted-foreground">Unique action types</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Array.isArray(statistics.top_users) ? statistics.top_users.length : 0}
                </div>
                <p className="text-xs text-muted-foreground">Users with activity</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Models Tracked</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Array.isArray(statistics.by_model) ? statistics.by_model.length : 0}
                </div>
                <p className="text-xs text-muted-foreground">Different model types</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance & Security Metrics */}
          {(statistics.performance || statistics.security) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statistics.performance && (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {typeof statistics.performance.avg_execution_time === 'number' 
                          ? statistics.performance.avg_execution_time.toFixed(2)
                          : Number(statistics.performance.avg_execution_time || 0).toFixed(2)}ms
                      </div>
                      <p className="text-xs text-muted-foreground">Average execution time</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Slow Requests</CardTitle>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {typeof statistics.performance.slow_requests === 'number'
                          ? statistics.performance.slow_requests.toLocaleString()
                          : Number(statistics.performance.slow_requests || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">&gt; 1 second</p>
                    </CardContent>
                  </Card>
                </>
              )}

              {statistics.security && (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {typeof statistics.security.failed_logins === 'number'
                          ? statistics.security.failed_logins.toLocaleString()
                          : Number(statistics.security.failed_logins || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Security alerts</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Unique IPs</CardTitle>
                      <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {typeof statistics.security.unique_ips === 'number'
                          ? statistics.security.unique_ips.toLocaleString()
                          : Number(statistics.security.unique_ips || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Different IP addresses</p>
                    </CardContent>
                  </Card>
                </>
              )}

              {statistics.error_rate !== undefined && statistics.error_rate !== null && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {typeof statistics.error_rate === 'number'
                        ? statistics.error_rate.toFixed(2)
                        : Number(statistics.error_rate || 0).toFixed(2)}%
                    </div>
                    <p className="text-xs text-muted-foreground">HTTP errors</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Top Change Frequency */}
          {statistics.change_frequency && statistics.change_frequency.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Most Frequently Changed Models</CardTitle>
                <CardDescription>Top models by change frequency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {statistics.change_frequency.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{item.model_name}</div>
                        <div className="text-xs text-muted-foreground">{item.model_type}</div>
                      </div>
                      <Badge variant="outline">{item.change_count} changes</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search descriptions..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label>User</Label>
              <Select
                value={filters.user_id || "all"}
                onValueChange={(value) => setFilters({ ...filters, user_id: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {Array.isArray(users) && users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name || user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Action</Label>
              <Select
                value={filters.action || "all"}
                onValueChange={(value) => setFilters({ ...filters, action: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="login_failed">Login Failed</SelectItem>
                  <SelectItem value="api_request">API Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Recent Hours</Label>
              <Select
                value={filters.recent_hours || "all"}
                onValueChange={(value) => setFilters({ ...filters, recent_hours: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="1">Last hour</SelectItem>
                  <SelectItem value="24">Last 24 hours</SelectItem>
                  <SelectItem value="168">Last week</SelectItem>
                  <SelectItem value="720">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={resetFilters} variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            Showing {logs.length} of {pagination.total} logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm">
                            {format(new Date(log.created_at), "MMM dd, yyyy")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "HH:mm:ss")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.user ? (
                            <div>
                              <div className="font-medium">{log.user.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {log.user.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">System</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(log.action)}>
                            <span className="flex items-center gap-1">
                              {getActionIcon(log.action)}
                              {log.action}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.model_type ? (
                            <div>
                              <div className="font-medium">
                                {getModelName(log.model_type)}
                              </div>
                              {log.model_id && (
                                <div className="text-xs text-muted-foreground">
                                  ID: {log.model_id}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {log.description || "No description"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{log.ip_address || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLog(log);
                              setDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.last_page > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.current_page} of {pagination.last_page}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination({
                          ...pagination,
                          current_page: Math.max(1, pagination.current_page - 1),
                        })
                      }
                      disabled={pagination.current_page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination({
                          ...pagination,
                          current_page: Math.min(
                            pagination.last_page,
                            pagination.current_page + 1
                          ),
                        })
                      }
                      disabled={pagination.current_page === pagination.last_page}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete information about this audit log entry
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Action</Label>
                  <div className="mt-1">
                    <Badge className={getActionColor(selectedLog.action)}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Time</Label>
                  <div className="mt-1 text-sm">
                    {format(new Date(selectedLog.created_at), "PPpp")}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">User</Label>
                  <div className="mt-1 text-sm">
                    {selectedLog.user
                      ? `${selectedLog.user.name} (${selectedLog.user.email})`
                      : "System"}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">IP Address</Label>
                  <div className="mt-1 text-sm">{selectedLog.ip_address || "-"}</div>
                </div>
                {selectedLog.model_type && (
                  <>
                    <div>
                      <Label className="text-sm font-semibold">Model Type</Label>
                      <div className="mt-1 text-sm">
                        {getModelName(selectedLog.model_type)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Model ID</Label>
                      <div className="mt-1 text-sm">{selectedLog.model_id}</div>
                    </div>
                  </>
                )}
                {selectedLog.route && (
                  <div>
                    <Label className="text-sm font-semibold">Route</Label>
                    <div className="mt-1 text-sm">{selectedLog.route}</div>
                  </div>
                )}
                {selectedLog.method && (
                  <div>
                    <Label className="text-sm font-semibold">HTTP Method</Label>
                    <div className="mt-1 text-sm">{selectedLog.method}</div>
                  </div>
                )}
                {selectedLog.response_status && (
                  <div>
                    <Label className="text-sm font-semibold">Response Status</Label>
                    <div className="mt-1 text-sm">{selectedLog.response_status}</div>
                  </div>
                )}
                {selectedLog.execution_time && (
                  <div>
                    <Label className="text-sm font-semibold">Execution Time</Label>
                    <div className="mt-1 text-sm">
                      {selectedLog.execution_time.toFixed(2)} ms
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedLog.description && (
                <div>
                  <Label className="text-sm font-semibold">Description</Label>
                  <div className="mt-1 text-sm p-2 bg-muted rounded">
                    {selectedLog.description}
                  </div>
                </div>
              )}

              {/* Changes */}
              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">
                    Changes ({Object.keys(selectedLog.changes).length} fields)
                  </Label>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Field</TableHead>
                          <TableHead>Old Value</TableHead>
                          <TableHead>New Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(selectedLog.changes).map(([field, change]) => (
                          <TableRow key={field}>
                            <TableCell className="font-medium">{field}</TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate bg-red-50 p-2 rounded text-sm">
                                {typeof change.old === "object"
                                  ? JSON.stringify(change.old)
                                  : String(change.old ?? "null")}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate bg-green-50 p-2 rounded text-sm">
                                {typeof change.new === "object"
                                  ? JSON.stringify(change.new)
                                  : String(change.new ?? "null")}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* User Agent */}
              {selectedLog.user_agent && (
                <div>
                  <Label className="text-sm font-semibold">User Agent</Label>
                  <div className="mt-1 text-xs p-2 bg-muted rounded break-all">
                    {selectedLog.user_agent}
                  </div>
                </div>
              )}

              {/* URL */}
              {selectedLog.url && (
                <div>
                  <Label className="text-sm font-semibold">URL</Label>
                  <div className="mt-1 text-xs p-2 bg-muted rounded break-all">
                    {selectedLog.url}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata &&
                Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold">Metadata</Label>
                    <div className="mt-1 text-xs p-2 bg-muted rounded">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

