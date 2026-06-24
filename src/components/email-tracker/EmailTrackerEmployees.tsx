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
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Employee {
  id: string;
  email: string;
  name: string;
  emails_sent_today: number;
  emails_sent_week: number;
  emails_sent_month: number;
  unique_recipients: number;
  top_recipient: string;
  external_email_percent: number;
  last_email_sent_at: string;
}

interface EmailTrackerEmployeesProps {
  onEmployeeSelect: (email: string) => void;
}

export function EmailTrackerEmployees({ onEmployeeSelect }: EmailTrackerEmployeesProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('emails_sent_month');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 15;

  useEffect(() => {
    fetchEmployees();
  }, [search, filter, sortBy, sortOrder, page]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('email-tracker-employees', {
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
        body: {
          search,
          filter,
          sortBy,
          sortOrder,
          page,
          pageSize,
        },
      });

      if (response.data) {
        setEmployees(response.data.employees);
        setTotalPages(response.data.totalPages);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="internal">Mostly Internal</SelectItem>
                <SelectItem value="external">Mostly External</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Employees ({total.toLocaleString()})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <SortableHeader column="name">Name</SortableHeader>
                  <SortableHeader column="email">Email</SortableHeader>
                  <SortableHeader column="emails_sent_today">Today</SortableHeader>
                  <SortableHeader column="emails_sent_week">This Week</SortableHeader>
                  <SortableHeader column="emails_sent_month">This Month</SortableHeader>
                  <SortableHeader column="unique_recipients">Recipients</SortableHeader>
                  <TableHead>Top Recipient</TableHead>
                  <SortableHeader column="external_email_percent">External %</SortableHeader>
                  <SortableHeader column="last_email_sent_at">Last Activity</SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(9)].map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow
                      key={employee.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onEmployeeSelect(employee.email)}
                    >
                      <TableCell className="font-medium">
                        {employee.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {employee.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.emails_sent_today > 50 ? 'destructive' : 'secondary'}>
                          {employee.emails_sent_today}
                        </Badge>
                      </TableCell>
                      <TableCell>{employee.emails_sent_week.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">
                        {employee.emails_sent_month.toLocaleString()}
                      </TableCell>
                      <TableCell>{employee.unique_recipients.toLocaleString()}</TableCell>
                      <TableCell className="max-w-32 truncate text-muted-foreground">
                        {employee.top_recipient || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={employee.external_email_percent > 50 ? 'outline' : 'secondary'}
                          className={employee.external_email_percent > 50 ? 'border-orange-500 text-orange-500' : ''}
                        >
                          {employee.external_email_percent}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {employee.last_email_sent_at
                          ? format(new Date(employee.last_email_sent_at), 'MMM d, h:mm a')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

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
  );
}