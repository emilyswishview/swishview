import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Users, CalendarDays, FileText, CheckCircle, XCircle, Clock, Image, TrendingUp, Phone, Target, BarChart3, Smile, ArrowLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, subMonths, addMonths } from 'date-fns';

const moodEmojis: Record<number, string> = { 1: "😞", 2: "😐", 3: "🙂", 4: "😊", 5: "🤩" };

const TrackerSection = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [viewingReport, setViewingReport] = useState<any>(null);
  const [updatingLeave, setUpdatingLeave] = useState<string | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<any>(null);
  const [detailReports, setDetailReports] = useState<any[]>([]);
  const [detailLeaves, setDetailLeaves] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  useEffect(() => { fetchData(); }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    const dateFrom = format(monthStart, 'yyyy-MM-dd');
    const dateTo = format(monthEnd, 'yyyy-MM-dd');
    const [reportsRes, leavesRes] = await Promise.all([
      supabase.from('daily_reports').select('*').gte('report_date', dateFrom).lte('report_date', dateTo).order('report_date', { ascending: false }),
      supabase.from('leave_requests').select('*').gte('leave_date', dateFrom).lte('leave_date', dateTo).order('leave_date', { ascending: false }),
    ]);
    
    // Get unique user IDs from reports and leaves
    const userIds = new Set<string>();
    reportsRes.data?.forEach(r => userIds.add(r.user_id));
    leavesRes.data?.forEach(l => userIds.add(l.user_id));
    
    // Only fetch profiles for users who have activity
    if (userIds.size > 0) {
      const { data: profilesData } = await supabase.from('profiles').select('id, email, full_name').in('id', Array.from(userIds));
      if (profilesData) setEmployees(profilesData);
    } else {
      setEmployees([]);
    }
    
    if (reportsRes.data) setReports(reportsRes.data);
    if (leavesRes.data) setLeaves(leavesRes.data);
    setLoading(false);
  };

  const handleLeaveAction = async (leaveId: string, status: 'approved' | 'rejected') => {
    setUpdatingLeave(leaveId);
    const { error } = await supabase.from('leave_requests').update({ status }).eq('id', leaveId);
    if (!error) await fetchData();
    setUpdatingLeave(null);
  };

  const getAttendanceSummary = (userId: string) => {
    const today = new Date();
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd > today ? today : monthEnd });
    const workingDays = allDays.filter(d => !isWeekend(d) && d < today);
    const userReports = reports.filter(r => r.user_id === userId);
    const userLeaves = leaves.filter(l => l.user_id === userId && l.status !== 'rejected');
    const reportedDates = new Set(userReports.map(r => r.report_date));
    const leaveDates = new Set(userLeaves.map(l => l.leave_date));
    const halfDayDates = new Set(userLeaves.filter(l => l.leave_type === 'half_day').map(l => l.leave_date));
    let present = 0, leaveCount = 0, lop = 0, halfDays = 0;
    for (const day of workingDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      if (halfDayDates.has(dateStr)) { halfDays++; present += reportedDates.has(dateStr) ? 0.5 : 0; if (!reportedDates.has(dateStr)) lop += 0.5; }
      else if (leaveDates.has(dateStr)) leaveCount++;
      else if (reportedDates.has(dateStr)) present++;
      else lop++;
    }
    return { present, leaves: leaveCount, lop, halfDays, total: workingDays.length };
  };

  const getPerformanceSummary = (userId: string) => {
    const userReports = reports.filter(r => r.user_id === userId);
    if (userReports.length === 0) return null;
    const totals = userReports.reduce((acc, r) => ({
      emails: acc.emails + (r.emails_sent || 0),
      sales: acc.sales + (r.sales_numbers || 0),
      calls: acc.calls + (r.calls_made || 0),
      meetings: acc.meetings + (r.meetings_attended || 0),
      tasks: acc.tasks + (r.tasks_completed || 0),
      leads: acc.leads + (r.leads_generated || 0),
      followUps: acc.followUps + (r.follow_ups_done || 0),
      hours: acc.hours + (parseFloat(r.hours_worked) || 8),
      moodSum: acc.moodSum + (r.mood_rating || 3),
    }), { emails: 0, sales: 0, calls: 0, meetings: 0, tasks: 0, leads: 0, followUps: 0, hours: 0, moodSum: 0 });
    return { ...totals, avgMood: Math.round(totals.moodSum / userReports.length), days: userReports.length };
  };

  const openEmployeeDetail = async (emp: any) => {
    setDetailEmployee(emp);
    setLoadingDetail(true);
    // Fetch ALL reports & leaves for this employee (no date filter)
    const [allReports, allLeaves] = await Promise.all([
      supabase.from('daily_reports').select('*').eq('user_id', emp.id).order('report_date', { ascending: false }),
      supabase.from('leave_requests').select('*').eq('user_id', emp.id).order('leave_date', { ascending: false }),
    ]);
    setDetailReports(allReports.data || []);
    setDetailLeaves(allLeaves.data || []);
    setLoadingDetail(false);
  };

  const filteredReports = selectedEmployee === 'all' ? reports : reports.filter(r => r.user_id === selectedEmployee);
  const filteredLeaves = selectedEmployee === 'all' ? leaves : leaves.filter(l => l.user_id === selectedEmployee);
  const pendingLeaves = filteredLeaves.filter(l => l.status === 'pending');

  const getEmployeeName = (userId: string) => {
    const emp = employees.find(e => e.id === userId);
    return emp?.full_name || emp?.email || 'Unknown';
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Employee Detail View
  if (detailEmployee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setDetailEmployee(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-xl font-bold text-foreground">{detailEmployee.full_name || detailEmployee.email}</h2>
            <p className="text-xs text-muted-foreground">{detailEmployee.email}</p>
          </div>
        </div>

        {loadingDetail ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* All-time reports */}
            <Card className="border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <FileText className="h-4 w-4 text-primary" />
                  All Reports ({detailReports.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-primary/10 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/5">
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Emails</TableHead>
                        <TableHead className="text-right">Sales</TableHead>
                        <TableHead className="text-right">Calls</TableHead>
                        <TableHead className="text-right">Tasks</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-center">Mood</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailReports.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No reports</TableCell></TableRow>
                      ) : detailReports.map(report => (
                        <TableRow key={report.id} className="hover:bg-primary/5 cursor-pointer" onClick={() => setViewingReport(report)}>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1.5">
                              {format(new Date(report.report_date + 'T00:00:00'), 'MMM d, yyyy')}
                              {report.edited_count > 0 && (
                                <span title={report.last_edited_at ? `Last edited ${format(new Date(report.last_edited_at), 'MMM d, h:mm a')}` : ''} className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-medium">
                                  Edited{report.edited_count > 1 ? ` ×${report.edited_count}` : ''}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">{report.emails_sent}</TableCell>
                          <TableCell className="text-right text-sm">{report.sales_numbers}</TableCell>
                          <TableCell className="text-right text-sm">{report.calls_made || 0}</TableCell>
                          <TableCell className="text-right text-sm">{report.tasks_completed || 0}</TableCell>
                          <TableCell className="text-right text-sm">{report.leads_generated || 0}</TableCell>
                          <TableCell className="text-center">{moodEmojis[report.mood_rating] || "🙂"}</TableCell>
                          <TableCell className="text-right text-sm">{report.hours_worked || 8}h</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="text-primary text-xs h-7" onClick={(e) => { e.stopPropagation(); setViewingReport(report); }}>View</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* All leaves */}
            <Card className="border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  All Leave Requests ({detailLeaves.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-primary/10 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/5">
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailLeaves.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No leave requests</TableCell></TableRow>
                      ) : detailLeaves.map(leave => (
                        <TableRow key={leave.id}>
                          <TableCell className="text-sm">{format(new Date(leave.leave_date + 'T00:00:00'), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="text-sm capitalize">{leave.leave_type.replace('_', ' ')}</TableCell>
                          <TableCell>
                            <Badge variant={leave.status === 'approved' ? 'default' : leave.status === 'rejected' ? 'destructive' : 'secondary'}>{leave.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {leave.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground" onClick={() => handleLeaveAction(leave.id, 'approved')} disabled={updatingLeave === leave.id}>✓</Button>
                                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleLeaveAction(leave.id, 'rejected')} disabled={updatingLeave === leave.id}>✗</Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Report Detail Modal */}
        <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {viewingReport && `Report — ${format(new Date(viewingReport.report_date + 'T00:00:00'), 'MMM d, yyyy')}`}
              </DialogTitle>
            </DialogHeader>
            {viewingReport && <ReportDetail report={viewingReport} />}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Daily Pulse — Manager View</h2>
          <p className="text-sm text-muted-foreground">Only employees with reports or leave requests are shown</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>← Prev</Button>
          <span className="text-sm font-medium min-w-[120px] text-center">{format(selectedMonth, 'MMMM yyyy')}</span>
          <Button variant="outline" size="sm" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}>Next →</Button>
        </div>
      </div>

      {/* Filter */}
      <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
        <SelectTrigger className="w-[250px]"><SelectValue placeholder="Filter by employee" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Employees</SelectItem>
          {employees.map(emp => (
            <SelectItem key={emp.id} value={emp.id}>{emp.full_name || emp.email}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Employee Performance Cards - clickable */}
      {employees.length === 0 ? (
        <Card className="border-primary/10"><CardContent className="py-12 text-center text-muted-foreground">No employees have submitted reports or leave requests for this month.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(selectedEmployee === 'all' ? employees : employees.filter(e => e.id === selectedEmployee)).map(emp => {
            const att = getAttendanceSummary(emp.id);
            const perf = getPerformanceSummary(emp.id);
            return (
              <Card key={emp.id} className="border-primary/10 hover:border-primary/25 transition-colors cursor-pointer hover:shadow-md" onClick={() => openEmployeeDetail(emp)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold truncate text-foreground">{emp.full_name || emp.email}</CardTitle>
                  <p className="text-[10px] text-muted-foreground">{emp.email} · Click to view all reports</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="p-1.5 rounded-lg bg-primary/10"><div className="text-sm font-bold text-primary">{att.present}</div><div className="text-[9px] text-muted-foreground">Present</div></div>
                    <div className="p-1.5 rounded-lg bg-primary/5"><div className="text-sm font-bold text-primary/60">{att.leaves}</div><div className="text-[9px] text-muted-foreground">Leave</div></div>
                    <div className="p-1.5 rounded-lg bg-destructive/5"><div className="text-sm font-bold text-destructive">{att.lop}</div><div className="text-[9px] text-muted-foreground">LOP</div></div>
                    <div className="p-1.5 rounded-lg bg-primary/5"><div className="text-sm font-bold text-primary/60">{att.halfDays}</div><div className="text-[9px] text-muted-foreground">Half</div></div>
                  </div>
                  {perf && (
                    <div className="grid grid-cols-3 gap-1.5 text-center border-t border-primary/5 pt-2">
                      <div><span className="text-xs font-semibold text-foreground">{perf.emails}</span><div className="text-[9px] text-muted-foreground">Emails</div></div>
                      <div><span className="text-xs font-semibold text-foreground">{perf.sales}</span><div className="text-[9px] text-muted-foreground">Sales</div></div>
                      <div><span className="text-xs font-semibold text-foreground">{perf.calls}</span><div className="text-[9px] text-muted-foreground">Calls</div></div>
                      <div><span className="text-xs font-semibold text-foreground">{perf.tasks}</span><div className="text-[9px] text-muted-foreground">Tasks</div></div>
                      <div><span className="text-xs font-semibold text-foreground">{perf.leads}</span><div className="text-[9px] text-muted-foreground">Leads</div></div>
                      <div><span className="text-lg">{moodEmojis[perf.avgMood] || "🙂"}</span><div className="text-[9px] text-muted-foreground">Avg Mood</div></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pending Leave Requests */}
      {pendingLeaves.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Pending Leave Requests ({pendingLeaves.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingLeaves.map(leave => (
                <div key={leave.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-primary/10">
                  <div>
                    <div className="text-sm font-medium text-foreground">{getEmployeeName(leave.user_id)}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(leave.leave_date + 'T00:00:00'), 'MMM d, yyyy')} — {leave.leave_type.replace('_', ' ')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="bg-primary text-primary-foreground h-7 text-xs" onClick={() => handleLeaveAction(leave.id, 'approved')} disabled={updatingLeave === leave.id}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleLeaveAction(leave.id, 'rejected')} disabled={updatingLeave === leave.id}>
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Detail Modal */}
      <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {viewingReport && `${getEmployeeName(viewingReport.user_id)} — ${format(new Date(viewingReport.report_date + 'T00:00:00'), 'MMM d, yyyy')}`}
            </DialogTitle>
          </DialogHeader>
          {viewingReport && <ReportDetail report={viewingReport} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ReportDetail = ({ report }: { report: any }) => (
  <div className="space-y-4">
    {report.edited_count > 0 && (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
        <span className="font-semibold">⚠ Edited {report.edited_count} time{report.edited_count > 1 ? 's' : ''}</span>
        {report.last_edited_at && <span>· Last edit {format(new Date(report.last_edited_at), 'MMM d, yyyy h:mm a')}</span>}
      </div>
    )}
    <div className="grid grid-cols-4 gap-3">
      {[
        { label: "Emails", value: report.emails_sent },
        { label: "Sales", value: report.sales_numbers },
        { label: "Calls", value: report.calls_made || 0 },
        { label: "Meetings", value: report.meetings_attended || 0 },
        { label: "Tasks", value: report.tasks_completed || 0 },
        { label: "Leads", value: report.leads_generated || 0 },
        { label: "Follow-ups", value: report.follow_ups_done || 0 },
        { label: "Hours", value: `${report.hours_worked || 8}h` },
      ].map(m => (
        <div key={m.label} className="text-center p-2 rounded-lg bg-primary/5 border border-primary/10">
          <div className="text-sm font-bold text-foreground">{m.value}</div>
          <div className="text-[9px] text-muted-foreground">{m.label}</div>
        </div>
      ))}
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Mood:</span>
      <span className="text-xl">{moodEmojis[report.mood_rating] || "🙂"}</span>
    </div>
    {report.blockers && (
      <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
        <div className="text-xs font-medium text-destructive mb-1">Blockers</div>
        <p className="text-sm text-foreground">{report.blockers}</p>
      </div>
    )}
    {report.additional_notes && (
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
        <div className="text-xs font-medium text-primary mb-1">Notes</div>
        <p className="text-sm text-foreground">{report.additional_notes}</p>
      </div>
    )}
    {report.attachment_urls && report.attachment_urls.length > 0 && (
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">Attachments</div>
        <div className="grid grid-cols-3 gap-2">
          {report.attachment_urls.map((url: string, i: number) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
              {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img src={url} alt={`Attachment ${i + 1}`} className="rounded-lg border border-primary/10 w-full h-24 object-cover" />
              ) : (
                <div className="rounded-lg border border-primary/10 p-3 text-center text-xs text-muted-foreground hover:bg-primary/5">
                  <FileText className="h-6 w-6 mx-auto mb-1 text-primary/40" />File {i + 1}
                </div>
              )}
            </a>
          ))}
        </div>
      </div>
    )}
  </div>
);

export default TrackerSection;
