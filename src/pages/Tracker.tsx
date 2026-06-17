import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Eye, EyeOff, Loader2, CalendarDays, FileText, Clock, LogOut, Upload, X, Image, Paperclip,
  Phone, Users, CheckSquare, Target, RotateCcw, BookOpen, Smile, AlertTriangle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay, subDays, isBefore, startOfDay } from "date-fns";

const SUPABASE_URL = "https://nuxixhoogohqligzgbdm.supabase.co";

const TrackerLogin = ({ onLogin }: { onLogin: () => void }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoggingIn(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (data.user) onLogin();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardHeader className="space-y-3 text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <Clock className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Daily Pulse</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in with your official credentials</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@swishview.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="border-primary/20 focus:border-primary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="border-primary/20 focus:border-primary" />
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoggingIn}>
              {isLoggingIn ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
            </Button>
            <Button type="button" variant="outline" className="w-full border-primary/20 text-primary hover:bg-primary/5" onClick={() => navigate("/")}>Back to Home</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const MoodSelector = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const moods = [
    { value: 1, emoji: "😞", label: "Bad" },
    { value: 2, emoji: "😐", label: "Okay" },
    { value: 3, emoji: "🙂", label: "Good" },
    { value: 4, emoji: "😊", label: "Great" },
    { value: 5, emoji: "🤩", label: "Amazing" },
  ];
  return (
    <div className="flex items-center gap-2">
      {moods.map(m => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={`flex flex-col items-center p-1.5 rounded-lg transition-all text-lg ${value === m.value ? 'bg-primary/15 ring-2 ring-primary scale-110' : 'hover:bg-primary/5'}`}
        >
          <span>{m.emoji}</span>
          <span className="text-[9px] text-muted-foreground">{m.label}</span>
        </button>
      ))}
    </div>
  );
};

const TrackerDashboard = ({ user, onLogout }: { user: any; onLogout: () => void }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [emailsSent, setEmailsSent] = useState("");
  const [salesNumbers, setSalesNumbers] = useState("");
  const [callsMade, setCallsMade] = useState("");
  const [meetingsAttended, setMeetingsAttended] = useState("");
  const [tasksCompleted, setTasksCompleted] = useState("");
  const [leadsGenerated, setLeadsGenerated] = useState("");
  const [followUpsDone, setFollowUpsDone] = useState("");
  const [hoursWorked, setHoursWorked] = useState("0");
  const [moodRating, setMoodRating] = useState(3);
  const [blockers, setBlockers] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [existingReport, setExistingReport] = useState<any>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Leave form state
  const [leaveDate, setLeaveDate] = useState<Date | undefined>(undefined);
  const [leaveType, setLeaveType] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
  const [monthlyLeaves, setMonthlyLeaves] = useState<any[]>([]);
  const [allReports, setAllReports] = useState<any[]>([]);

  const today = new Date();
  const yesterday = subDays(today, 1);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [reportsRes, leavesRes, allReportsRes] = await Promise.all([
        supabase.from("daily_reports").select("*").eq("user_id", user.id).gte("report_date", format(monthStart, "yyyy-MM-dd")).lte("report_date", format(monthEnd, "yyyy-MM-dd")),
        supabase.from("leave_requests").select("*").eq("user_id", user.id).gte("leave_date", format(monthStart, "yyyy-MM-dd")).lte("leave_date", format(monthEnd, "yyyy-MM-dd")),
        supabase.from("daily_reports").select("*").eq("user_id", user.id).order("report_date", { ascending: false }),
      ]);
      if (reportsRes.data) setMonthlyReports(reportsRes.data);
      if (leavesRes.data) setMonthlyLeaves(leavesRes.data);
      if (allReportsRes.data) setAllReports(allReportsRes.data);
    };
    fetchData();
  }, [user, submitting, leaveSubmitting]);

  useEffect(() => {
    if (!selectedDate || !user) {
      setExistingReport(null);
      setEmailsSent(""); setSalesNumbers(""); setCallsMade(""); setMeetingsAttended("");
      setTasksCompleted(""); setLeadsGenerated(""); setFollowUpsDone(""); setHoursWorked("0");
      setMoodRating(3); setBlockers(""); setAdditionalNotes("");
      setAttachments([]); setExistingAttachments([]);
      return;
    }
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const existing = monthlyReports.find(r => r.report_date === dateStr) || allReports.find(r => r.report_date === dateStr);
    if (existing) {
      setExistingReport(existing);
      setEmailsSent(String(existing.emails_sent || 0));
      setSalesNumbers(String(existing.sales_numbers || 0));
      setCallsMade(String(existing.calls_made || 0));
      setMeetingsAttended(String(existing.meetings_attended || 0));
      setTasksCompleted(String(existing.tasks_completed || 0));
      setLeadsGenerated(String(existing.leads_generated || 0));
      setFollowUpsDone(String(existing.follow_ups_done || 0));
      setHoursWorked(String(existing.hours_worked || 0));
      setMoodRating(existing.mood_rating || 3);
      setBlockers(existing.blockers || "");
      setAdditionalNotes(existing.additional_notes || "");
      setExistingAttachments(existing.attachment_urls || []);
    } else {
      setExistingReport(null);
      setEmailsSent(""); setSalesNumbers(""); setCallsMade(""); setMeetingsAttended("");
      setTasksCompleted(""); setLeadsGenerated(""); setFollowUpsDone(""); setHoursWorked("0");
      setMoodRating(3); setBlockers(""); setAdditionalNotes("");
      setAttachments([]); setExistingAttachments([]);
    }
  }, [selectedDate, monthlyReports, allReports, user]);

  const attendance = useMemo(() => {
    const allDays = eachDayOfInterval({ start: monthStart, end: isBefore(monthEnd, today) ? monthEnd : today });
    const workingDays = allDays.filter(d => !isWeekend(d) && !isSameDay(d, today));
    const reportedDates = new Set(monthlyReports.map(r => r.report_date));
    const activeLeaves = monthlyLeaves.filter(l => l.status !== 'rejected');
    const leaveDates = new Set(activeLeaves.map(l => l.leave_date));
    const halfDayDates = new Set(activeLeaves.filter(l => l.leave_type === 'half_day').map(l => l.leave_date));
    const lopDates = new Set(activeLeaves.filter(l => l.leave_type === 'lop' || l.leave_type === 'loss_of_pay').map(l => l.leave_date));

    const presentDays: string[] = [];
    const leaveDays: string[] = [];
    const halfDayList: string[] = [];
    const lopDays: string[] = [];

    for (const day of workingDays) {
      const dateStr = format(day, "yyyy-MM-dd");
      const hasReport = reportedDates.has(dateStr);
      const hasLeave = leaveDates.has(dateStr);
      const isHalfDay = halfDayDates.has(dateStr);
      const isLop = lopDates.has(dateStr);

      if (isLop) lopDays.push(dateStr);
      else if (isHalfDay) { halfDayList.push(dateStr); if (hasReport) presentDays.push(dateStr); }
      else if (hasLeave) leaveDays.push(dateStr);
      else if (hasReport) presentDays.push(dateStr);
    }
    return {
      present: presentDays.length,
      leaves: leaveDays.length,
      lop: lopDays.length,
      halfDays: halfDayList.length,
      totalWorking: workingDays.length,
      presentDays, leaveDays, lopDays, halfDayList,
    };
  }, [monthlyReports, monthlyLeaves, today]);

  const [detailsModal, setDetailsModal] = useState<{ open: boolean; title: string; dates: string[] }>({ open: false, title: "", dates: [] });
  const openDetails = (title: string, dates: string[]) => setDetailsModal({ open: true, title, dates });

  const uploadFiles = async (): Promise<string[]> => {
    if (attachments.length === 0) return existingAttachments;
    setUploading(true);
    const urls: string[] = [...existingAttachments];
    for (const file of attachments) {
      const ext = file.name.split('.').pop();
      const filePath = `tracker-attachments/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('assets').upload(filePath, file);
      if (!error) urls.push(`${SUPABASE_URL}/storage/v1/object/public/assets/${filePath}`);
    }
    setUploading(false);
    return urls;
  };

  const handleSubmitReport = async () => {
    if (!selectedDate || !user) return;
    setSubmitting(true);
    try {
      const uploadedUrls = await uploadFiles();
      const reportData: any = {
        user_id: user.id,
        report_date: format(selectedDate, "yyyy-MM-dd"),
        emails_sent: parseInt(emailsSent) || 0,
        sales_numbers: parseInt(salesNumbers) || 0,
        calls_made: parseInt(callsMade) || 0,
        meetings_attended: parseInt(meetingsAttended) || 0,
        tasks_completed: parseInt(tasksCompleted) || 0,
        leads_generated: parseInt(leadsGenerated) || 0,
        follow_ups_done: parseInt(followUpsDone) || 0,
        hours_worked: parseFloat(hoursWorked) || 0,
        mood_rating: moodRating,
        blockers: blockers || null,
        additional_notes: additionalNotes || null,
        attachment_urls: uploadedUrls,
      };
      let isEdit = false;
      if (existingReport) {
        isEdit = true;
        const { error } = await supabase.from("daily_reports").update({
          ...reportData,
          edited_count: (existingReport.edited_count || 0) + 1,
          last_edited_at: new Date().toISOString(),
        }).eq("id", existingReport.id);
        if (error) throw error;
        toast({ title: "Report updated successfully" });
      } else {
        const { error } = await supabase.from("daily_reports").insert(reportData);
        if (error) throw error;
        toast({ title: "Report submitted successfully" });
      }
      // Fire-and-forget admin notification
      supabase.functions.invoke("notify-user-activity", {
        body: {
          type: "tracker_report",
          data: {
            user_email: user.email,
            user_name: user.user_metadata?.full_name || user.email,
            report_date: reportData.report_date,
            is_edit: isEdit,
            edited_count: isEdit ? (existingReport.edited_count || 0) + 1 : 0,
            emails_sent: reportData.emails_sent,
            sales_numbers: reportData.sales_numbers,
            calls_made: reportData.calls_made,
            meetings_attended: reportData.meetings_attended,
            tasks_completed: reportData.tasks_completed,
            leads_generated: reportData.leads_generated,
            follow_ups_done: reportData.follow_ups_done,
            blogs_created: reportData.hours_worked,
            mood_rating: reportData.mood_rating,
            blockers: reportData.blockers,
            additional_notes: reportData.additional_notes,
            attachment_urls: reportData.attachment_urls,
          },
        },
      }).catch((e) => console.error("notify failed", e));
      setAttachments([]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitLeave = async () => {
    if (!leaveDate || !leaveType || !user) return;
    setLeaveSubmitting(true);
    try {
      const { error } = await supabase.from("leave_requests").insert({
        user_id: user.id, leave_date: format(leaveDate, "yyyy-MM-dd"), leave_type: leaveType,
      });
      if (error) {
        if (error.code === "23505") toast({ title: "Leave already requested for this date", variant: "destructive" });
        else throw error;
      } else {
        toast({ title: "Leave request submitted" });
        setLeaveDate(undefined); setLeaveType(""); setLeaveReason("");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const removeAttachment = (index: number) => setAttachments(prev => prev.filter((_, i) => i !== index));
  const removeExistingAttachment = (index: number) => setExistingAttachments(prev => prev.filter((_, i) => i !== index));
  const isDateDisabled = (date: Date) => isBefore(today, date) && !isSameDay(date, today);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-primary/10 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Daily Pulse</h1>
              <p className="text-[11px] text-muted-foreground -mt-0.5">by SwishView</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={onLogout} className="text-muted-foreground hover:text-destructive h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Attendance Summary */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Present", value: attendance.present, dates: attendance.presentDays, bg: "bg-primary/10 border-primary/20", color: "text-primary" },
            { label: "Leaves", value: attendance.leaves, dates: attendance.leaveDays, bg: "bg-primary/5 border-primary/10", color: "text-primary/70" },
            { label: "LOP", value: attendance.lop, dates: attendance.lopDays, bg: "bg-destructive/5 border-destructive/10", color: "text-destructive" },
            { label: "Half Days", value: attendance.halfDays, dates: attendance.halfDayList, bg: "bg-primary/5 border-primary/10", color: "text-primary/70" },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => openDetails(item.label, item.dates)}
              className={`text-center p-3 rounded-xl border ${item.bg} hover:opacity-80 transition`}
            >
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{item.label}</div>
            </button>
          ))}
        </div>

        <Dialog open={detailsModal.open} onOpenChange={(o) => setDetailsModal(s => ({ ...s, open: o }))}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{detailsModal.title} — {detailsModal.dates.length} day{detailsModal.dates.length !== 1 ? 's' : ''}</DialogTitle>
            </DialogHeader>
            {detailsModal.dates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No days to show.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {detailsModal.dates.map(d => {
                  const report = monthlyReports.find(r => r.report_date === d);
                  return (
                    <div key={d} className="border border-primary/10 rounded-lg p-3 text-sm">
                      <div className="font-semibold text-foreground">{format(new Date(d + "T00:00:00"), "EEEE, MMM d, yyyy")}</div>
                      {report && (
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>Emails: <b className="text-foreground">{report.emails_sent || 0}</b></span>
                          <span>Sales: <b className="text-foreground">{report.sales_numbers || 0}</b></span>
                          <span>Calls: <b className="text-foreground">{report.calls_made || 0}</b></span>
                          <span>Meetings: <b className="text-foreground">{report.meetings_attended || 0}</b></span>
                          <span>Tasks: <b className="text-foreground">{report.tasks_completed || 0}</b></span>
                          <span>Leads: <b className="text-foreground">{report.leads_generated || 0}</b></span>
                          <span>Follow-ups: <b className="text-foreground">{report.follow_ups_done || 0}</b></span>
                          <span>Blogs: <b className="text-foreground">{report.hours_worked || 0}</b></span>
                          {report.blockers && <span className="col-span-2">Blockers: <b className="text-foreground">{report.blockers}</b></span>}
                          {report.additional_notes && <span className="col-span-2">Notes: <b className="text-foreground">{report.additional_notes}</b></span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Main Daily Report Section - form always visible */}
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <FileText className="h-4 w-4 text-primary" />
              Daily Activity Log
            </CardTitle>
            <p className="text-xs text-muted-foreground">Select any past date or today to log/edit your activity. Unreported working days = LOP.</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Calendar */}
              <div className="lg:w-auto flex-shrink-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={isDateDisabled}
                  className="rounded-xl border border-primary/10 mx-auto pointer-events-auto"
                  modifiers={{
                    reported: allReports.map(r => new Date(r.report_date + "T00:00:00")),
                    leave: monthlyLeaves.filter(l => l.status !== 'rejected').map(l => new Date(l.leave_date + "T00:00:00")),
                  }}
                  modifiersClassNames={{
                    reported: "bg-primary/20 text-primary font-semibold",
                    leave: "bg-primary/5 text-primary/60",
                  }}
                />
              </div>

              {/* Form - always visible since selectedDate defaults to today */}
              {selectedDate ? (
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{format(selectedDate, "EEEE, MMM d, yyyy")}</span>
                    {existingReport && <Badge className="bg-primary/10 text-primary text-xs border-0">Editing</Badge>}
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Emails Sent", value: emailsSent, set: setEmailsSent, icon: FileText },
                      { label: "Sales", value: salesNumbers, set: setSalesNumbers, icon: Target },
                      { label: "Calls Made", value: callsMade, set: setCallsMade, icon: Phone },
                      { label: "Meetings", value: meetingsAttended, set: setMeetingsAttended, icon: Users },
                      { label: "Tasks Done", value: tasksCompleted, set: setTasksCompleted, icon: CheckSquare },
                      { label: "Leads", value: leadsGenerated, set: setLeadsGenerated, icon: Target },
                      { label: "Follow-ups", value: followUpsDone, set: setFollowUpsDone, icon: RotateCcw },
                      { label: "Blogs Created", value: hoursWorked, set: setHoursWorked, icon: BookOpen },
                    ].map(field => (
                      <div key={field.label}>
                        <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <field.icon className="h-2.5 w-2.5" />{field.label}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step={"1"}
                          value={field.value}
                          onChange={(e) => field.set(e.target.value)}
                          placeholder="0"
                          className="h-9 text-sm border-primary/15 focus:border-primary"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Mood */}
                  <div>
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                      <Smile className="h-2.5 w-2.5" /> How was your day?
                    </Label>
                    <MoodSelector value={moodRating} onChange={setMoodRating} />
                  </div>

                  {/* Blockers */}
                  <div>
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-2.5 w-2.5" /> Blockers / Challenges
                    </Label>
                    <Input value={blockers} onChange={(e) => setBlockers(e.target.value)} placeholder="Any blockers faced today..." className="text-sm border-primary/15 focus:border-primary" />
                  </div>

                  {/* Notes */}
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Additional Notes</Label>
                    <Textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} placeholder="Key highlights, wins, or anything noteworthy..." rows={2} className="text-sm border-primary/15 focus:border-primary" />
                  </div>

                  {/* Attachments */}
                  <div>
                    <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xlsx,.csv" className="hidden" onChange={(e) => {
                      if (e.target.files) setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
                    }} />
                    <Button type="button" variant="outline" size="sm" className="w-full border-dashed border-primary/20 text-primary hover:bg-primary/5" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-3 w-3 mr-2" /> Attach Screenshots / Files
                    </Button>
                    {(existingAttachments.length > 0 || attachments.length > 0) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {existingAttachments.map((url, i) => (
                          <div key={`e-${i}`} className="relative group">
                            {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                              <img src={url} alt="" className="h-14 w-14 object-cover rounded-lg border border-primary/10" />
                            ) : (
                              <div className="h-14 w-14 rounded-lg border border-primary/10 flex items-center justify-center bg-primary/5"><FileText className="h-4 w-4 text-primary/50" /></div>
                            )}
                            <button onClick={() => removeExistingAttachment(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2.5 w-2.5" /></button>
                          </div>
                        ))}
                        {attachments.map((file, i) => (
                          <div key={`n-${i}`} className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-primary/10 bg-primary/5 text-xs">
                            <Image className="h-3 w-3 text-primary/50" />
                            <span className="max-w-[70px] truncate text-foreground">{file.name}</span>
                            <button onClick={() => removeAttachment(i)} className="text-destructive"><X className="h-3 w-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button onClick={handleSubmitReport} disabled={submitting || uploading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    {(submitting || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {existingReport ? "Update Report" : "Submit Report"}
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-12">
                  <div className="text-center">
                    <CalendarDays className="h-10 w-10 mx-auto mb-3 text-primary/30" />
                    <p>Select a date to log your daily activity</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* All Submitted Reports History */}
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <FileText className="h-4 w-4 text-primary" />
              Your Submitted Reports
            </CardTitle>
            <p className="text-xs text-muted-foreground">All daily reports you've submitted. Click any date to view or edit.</p>
          </CardHeader>
          <CardContent>
            {allReports.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No reports submitted yet.</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {allReports.map(report => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedDate(new Date(report.report_date + "T00:00:00"))}
                    className="w-full text-left border border-primary/10 rounded-lg p-3 hover:bg-primary/5 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-foreground">{format(new Date(report.report_date + "T00:00:00"), "EEEE, MMM d, yyyy")}</span>
                      <div className="flex items-center gap-1.5">
                        {report.edited_count > 0 && (
                          <Badge className="bg-amber-100 text-amber-700 text-[10px] border-0" title={report.last_edited_at ? `Last edited ${format(new Date(report.last_edited_at), "MMM d, h:mm a")}` : ""}>
                            Edited{report.edited_count > 1 ? ` ×${report.edited_count}` : ""}
                          </Badge>
                        )}
                        <Badge className="bg-primary/10 text-primary text-[10px] border-0">View / Edit</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Emails: <b className="text-foreground">{report.emails_sent || 0}</b></span>
                      <span>Sales: <b className="text-foreground">{report.sales_numbers || 0}</b></span>
                      <span>Calls: <b className="text-foreground">{report.calls_made || 0}</b></span>
                      <span>Meetings: <b className="text-foreground">{report.meetings_attended || 0}</b></span>
                      <span>Tasks: <b className="text-foreground">{report.tasks_completed || 0}</b></span>
                      <span>Leads: <b className="text-foreground">{report.leads_generated || 0}</b></span>
                      <span>Follow-ups: <b className="text-foreground">{report.follow_ups_done || 0}</b></span>
                      <span>Blogs: <b className="text-foreground">{report.hours_worked || 0}</b></span>
                    </div>
                    {report.additional_notes && (
                      <div className="mt-2 text-xs text-muted-foreground line-clamp-2">📝 {report.additional_notes}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Apply Leave Section - at bottom */}
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              Apply for Leave
            </CardTitle>
            <p className="text-xs text-muted-foreground">Submit a leave request with details</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Leave Type</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger className="border-primary/20"><SelectValue placeholder="Select leave type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick_leave">🤒 Sick Leave</SelectItem>
                    <SelectItem value="casual_leave">🏖️ Casual Leave</SelectItem>
                    <SelectItem value="half_day">⏰ Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Select Date</Label>
                <Input
                  type="date"
                  className="border-primary/20"
                  min={format(today, "yyyy-MM-dd")}
                  value={leaveDate ? format(leaveDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => setLeaveDate(e.target.value ? new Date(e.target.value + "T00:00:00") : undefined)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Reason (optional)</Label>
              <Textarea
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Brief reason for leave..."
                rows={2}
                className="text-sm border-primary/15 focus:border-primary"
              />
            </div>
            <Button onClick={handleSubmitLeave} disabled={leaveSubmitting || !leaveDate || !leaveType} className="w-full sm:w-auto bg-primary text-primary-foreground">
              {leaveSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CalendarDays className="h-4 w-4 mr-2" /> Submit Leave Request
            </Button>

            {/* Leave history */}
            {monthlyLeaves.length > 0 && (
              <div className="border-t border-primary/10 pt-4 mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Your Leave Requests This Month</p>
                <div className="flex flex-wrap gap-2">
                  {monthlyLeaves.map(leave => (
                    <Badge key={leave.id} variant={leave.status === "approved" ? "default" : leave.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                      {format(new Date(leave.leave_date + "T00:00:00"), "MMM d")} · {leave.leave_type.replace("_", " ")} · {leave.status}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

const Tracker = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) { setUser(session.user); setIsAuthenticated(true); }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <TrackerLogin onLogin={checkAuth} />;
  return <TrackerDashboard user={user} onLogout={handleLogout} />;
};

export default Tracker;
