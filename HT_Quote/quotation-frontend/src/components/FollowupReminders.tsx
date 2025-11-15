"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Bell, Calendar, Send, X, AlertCircle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface FollowupReminder {
  id: number;
  quotation_id: number;
  followup_number: number;
  due_date: string;
  status: string;
  quotation: {
    id: number;
    quotation_number: string;
    total_amount: number;
    currency: string;
    customer: {
      company_name: string;
      contact_person: string;
    };
  };
}

export default function FollowupReminders() {
  const router = useRouter();
  const { toast } = useToast();
  const [followups, setFollowups] = useState<FollowupReminder[]>([]);
  const [stats, setStats] = useState({
    total_pending: 0,
    overdue: 0,
    due_today: 0,
    sent_this_month: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<number | null>(null);

  useEffect(() => {
    fetchFollowups();
    fetchStatistics();
  }, []);

  const fetchFollowups = async () => {
    try {
      setLoading(true);
      const response = await api.get('/quotation-followups/pending?limit=5');
      setFollowups(response.data || []);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/quotation-followups/statistics');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleSendFollowup = async (followupId: number) => {
    try {
      setSendingId(followupId);
      await api.post(`/quotation-followups/${followupId}/send`);
      toast({
        title: "Success",
        description: "Follow-up reminder sent successfully",
      });
      await fetchFollowups();
      await fetchStatistics();
    } catch (error) {
      console.error('Error sending follow-up:', error);
      toast({
        title: "Error",
        description: "Failed to send follow-up reminder",
        variant: "destructive",
      });
    } finally {
      setSendingId(null);
    }
  };

  const handleSkipFollowup = async (followupId: number) => {
    try {
      await api.post(`/quotation-followups/${followupId}/skip`, {
        reason: 'Manually skipped from dashboard'
      });
      toast({
        title: "Success",
        description: "Follow-up skipped",
      });
      await fetchFollowups();
      await fetchStatistics();
    } catch (error) {
      console.error('Error skipping follow-up:', error);
      toast({
        title: "Error",
        description: "Failed to skip follow-up",
        variant: "destructive",
      });
    }
  };

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isOverdue = (dueDate: string) => {
    return getDaysOverdue(dueDate) > 0;
  };

  const isDueToday = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    return due.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Follow-up Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-900 font-medium">Overdue</p>
                <p className="text-3xl font-bold text-red-700">{stats.overdue}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-900 font-medium">Due Today</p>
                <p className="text-3xl font-bold text-yellow-700">{stats.due_today}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-900 font-medium">Pending</p>
                <p className="text-3xl font-bold text-blue-700">{stats.total_pending}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-900 font-medium">Sent This Month</p>
                <p className="text-3xl font-bold text-green-700">{stats.sent_this_month}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Follow-ups Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Pending Follow-up Reminders
          </CardTitle>
          <CardDescription>
            Action required: Follow-ups that need to be sent
          </CardDescription>
        </CardHeader>
        <CardContent>
          {followups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">All caught up!</h3>
              <p className="text-muted-foreground">No pending follow-ups at the moment</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Follow-up #</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followups.map((followup) => (
                  <TableRow key={followup.id}>
                    <TableCell>
                      <button
                        onClick={() => router.push(`/dashboard/quotations/${followup.quotation.id}`)}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {followup.quotation.quotation_number}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{followup.quotation.customer.company_name}</p>
                        <p className="text-sm text-gray-500">{followup.quotation.customer.contact_person}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">
                        {followup.quotation.currency} {Number(followup.quotation.total_amount).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {followup.followup_number === 1 && "1st"}
                        {followup.followup_number === 2 && "2nd"}
                        {followup.followup_number === 3 && "3rd"}
                        {followup.followup_number > 3 && `${followup.followup_number}th`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{new Date(followup.due_date).toLocaleDateString()}</p>
                        {isOverdue(followup.due_date) && (
                          <p className="text-xs text-red-600 font-semibold">
                            {getDaysOverdue(followup.due_date)} days overdue
                          </p>
                        )}
                        {isDueToday(followup.due_date) && (
                          <p className="text-xs text-yellow-600 font-semibold">Due today</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isOverdue(followup.due_date) ? (
                        <Badge variant="destructive">Overdue</Badge>
                      ) : isDueToday(followup.due_date) ? (
                        <Badge className="bg-yellow-100 text-yellow-800">Due Today</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleSendFollowup(followup.id)}
                          disabled={sendingId === followup.id}
                        >
                          <Send className="mr-1 h-3 w-3" />
                          {sendingId === followup.id ? "Sending..." : "Send"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSkipFollowup(followup.id)}
                          disabled={sendingId === followup.id}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
