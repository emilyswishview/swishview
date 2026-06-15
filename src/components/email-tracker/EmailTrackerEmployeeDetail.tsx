import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Mail, 
  Users, 
  Globe, 
  Building2,
  Clock,
  TrendingUp,
  Paperclip,
  HardDrive,
  Shield,
  AlertTriangle,
  MessageSquare,
  Tag,
  Activity,
  FileText,
  Send,
  Eye,
  Reply,
  Forward,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { EmailDetailModal } from './EmailDetailModal';

interface EmailLog {
  id: string;
  message_id: string;
  recipients: string[];
  recipient_domains: string[];
  cc_recipients?: string[];
  bcc_recipients?: string[];
  subject: string;
  is_external: boolean;
  sent_at: string;
  attachment_count?: number;
  attachment_names?: string[];
  has_attachments?: boolean;
  message_size_bytes?: number;
  is_encrypted?: boolean;
  delivery_status?: string;
  labels?: string[];
  thread_id?: string;
}

interface EmailEvent {
  id: string;
  message_id: string;
  event_type: string;
  event_time: string;
}

interface Attachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type?: string;
  file_extension?: string;
  file_size_bytes?: number;
  sent_at: string;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
}

interface Insights {
  topRecipients: Array<{ email: string; count: number }>;
  topDomains: Array<{ domain: string; count: number }>;
  topAttachmentTypes: Array<{ type: string; count: number }>;
  labelUsage: Array<{ label: string; count: number }>;
  hourlyActivity: Array<{ hour: number; hourLabel: string; sent: number; read: number; replied: number }>;
  internalCount: number;
  externalCount: number;
  internalPercent: number;
  externalPercent: number;
  avgEmailsPerDay: number;
  totalEmails: number;
  totalAttachments: number;
  totalAttachmentSizeMB: number;
  totalDataSentMB: number;
  uniqueThreads: number;
  encryptedCount: number;
  encryptedPercent: number;
}

interface Employee {
  email: string;
  name: string;
  department?: string;
  emails_sent_today: number;
  emails_sent_week: number;
  emails_sent_month: number;
  unique_recipients: number;
  external_email_percent: number;
  total_attachments_sent?: number;
  total_data_sent_bytes?: number;
  unique_threads?: number;
  reply_rate_percent?: number;
  most_active_hour?: number;
  suspicious_activity_count?: number;
}

interface EmailTrackerEmployeeDetailProps {
  email: string;
  onBack: () => void;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))', 'hsl(var(--accent))'];

export function EmailTrackerEmployeeDetail({ email }: EmailTrackerEmployeeDetailProps) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const pageSize = 25;

  useEffect(() => {
    fetchEmployeeDetail();
  }, [email, domainFilter, typeFilter, page]);

  const fetchEmployeeDetail = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('email-tracker-employee-detail', {
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
        body: {
          email,
          domain: domainFilter,
          type: typeFilter,
          page,
          pageSize,
        },
      });

      if (response.data) {
        setEmployee(response.data.employee);
        setLogs(response.data.logs);
        setEvents(response.data.events || []);
        setAttachments(response.data.attachments || []);
        setAlerts(response.data.alerts || []);
        setInsights(response.data.insights);
        setTotalPages(response.data.totalPages);
      }
    } catch (error) {
      console.error('Error fetching employee detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pieData = insights ? [
    { name: 'Internal', value: insights.internalPercent },
    { name: 'External', value: insights.externalPercent },
  ] : [];

  const statCards = [
    { title: 'Total Emails', value: insights?.totalEmails || 0, icon: Mail, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Avg/Day', value: insights?.avgEmailsPerDay || 0, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'Unique Recipients', value: employee?.unique_recipients || 0, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'External %', value: `${employee?.external_email_percent || 0}%`, icon: Globe, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: 'Attachments', value: insights?.totalAttachments || 0, icon: Paperclip, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { title: 'Data Sent', value: `${insights?.totalDataSentMB || 0} MB`, icon: HardDrive, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { title: 'Threads', value: insights?.uniqueThreads || 0, icon: MessageSquare, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Encrypted', value: `${insights?.encryptedPercent || 0}%`, icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'sent': return <Send className="h-4 w-4 text-blue-500" />;
      case 'read': return <Eye className="h-4 w-4 text-green-500" />;
      case 'replied': return <Reply className="h-4 w-4 text-purple-500" />;
      case 'forwarded': return <Forward className="h-4 w-4 text-orange-500" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      default: return 'bg-blue-500 text-white';
    }
  };

  if (isLoading && !employee) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                  <p className="text-lg font-bold truncate">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overview Section */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Recipients */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Top 10 Recipients</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-64">
                <div className="space-y-1">
                  {insights?.topRecipients.slice(0, 10).map((recipient, i) => (
                    <div key={recipient.email} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs text-muted-foreground w-4 flex-shrink-0">{i + 1}.</span>
                        <span className="text-xs font-mono break-all">{recipient.email}</span>
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0">{recipient.count}</Badge>
                    </div>
                  ))}
                  {(!insights?.topRecipients || insights.topRecipients.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Top Domains */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Top Domains</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={insights?.topDomains.slice(0, 5) || []}
                    layout="vertical"
                    margin={{ left: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="domain"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Internal vs External */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Email Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => `${value}%`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">Internal ({insights?.internalPercent}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">External ({insights?.externalPercent}%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Email Logs Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Email Logs</h2>
        <Card>
          <CardHeader className="py-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <CardTitle className="text-base font-semibold">All Emails</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter by domain..."
                    value={domainFilter}
                    onChange={(e) => {
                      setDomainFilter(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9 w-48"
                  />
                </div>
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Attachments</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-16">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(10)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(7)].map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No email logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => { setSelectedEmail(log); setShowEmailModal(true); }}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(log.sent_at), 'MMM d, h:mm a')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {log.recipients.slice(0, 2).map((r, i) => (
                              <Badge key={i} variant="outline" className="text-xs" title={r}>
                                {r.length > 25 ? r.substring(0, 25) + '...' : r}
                              </Badge>
                            ))}
                            {log.recipients.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{log.recipients.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-64">
                          <span className="text-sm text-muted-foreground" title={log.subject || '(No subject)'}>
                            {log.subject ? (log.subject.length > 50 ? log.subject.substring(0, 50) + '...' : log.subject) : '(No subject)'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {log.has_attachments && (
                            <div className="flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              <span className="text-xs">{log.attachment_count}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.message_size_bytes ? `${Math.round(log.message_size_bytes / 1024)}KB` : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge variant={log.is_external ? 'outline' : 'secondary'}>
                              {log.is_external ? 'Ext' : 'Int'}
                            </Badge>
                            {log.is_encrypted && (
                              <Badge variant="default" className="bg-green-500">
                                <Shield className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0"
                            onClick={(e) => { 
                              e.stopPropagation();
                              setSelectedEmail(log); 
                              setShowEmailModal(true); 
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Email Detail Modal */}
            <EmailDetailModal 
              email={selectedEmail} 
              open={showEmailModal} 
              onOpenChange={setShowEmailModal} 
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="bg-background hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="bg-background hover:bg-muted"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Activity</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Recent Activity Events</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted">
                      {getEventIcon(event.event_type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{event.event_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.event_time), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Message: {event.message_id}
                        </p>
                      </div>
                    </div>
                  ))}
                  {events.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No activity events found</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Hourly Activity Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={insights?.hourlyActivity || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hourLabel" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area type="monotone" dataKey="sent" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Attachments Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Attachments</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Recent Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.file_type || attachment.file_extension || 'Unknown type'} • 
                          {attachment.file_size_bytes ? ` ${Math.round(attachment.file_size_bytes / 1024)}KB` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(attachment.sent_at), 'MMM d')}
                      </span>
                    </div>
                  ))}
                  {attachments.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No attachments found</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Attachment Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={insights?.topAttachmentTypes || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      nameKey="type"
                      label={({ type, count }) => `${type}: ${count}`}
                    >
                      {(insights?.topAttachmentTypes || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Security Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Security</h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Security Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-4 p-4 rounded-lg border">
                  <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                  <div className="flex-1">
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Type: {alert.alert_type}</span>
                      <span>Status: {alert.status}</span>
                      <span>{format(new Date(alert.created_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">No security alerts</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Encryption Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span>Encrypted Emails</span>
                  <Badge variant="default" className="bg-green-500">{insights?.encryptedCount || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span>Encryption Rate</span>
                  <Badge variant="outline">{insights?.encryptedPercent || 0}%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" /> Label Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights?.labelUsage.slice(0, 5).map((label) => (
                  <div key={label.label} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm">{label.label}</span>
                    <Badge variant="outline">{label.count}</Badge>
                  </div>
                ))}
                {(!insights?.labelUsage || insights.labelUsage.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No labels used</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
