import { useEffect, useMemo, useState } from 'react';
import { Download, TrendingUp, Users, Calendar as CalendarIcon, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContactTypeChart } from '@/components/dashboard/ContactTypeChart';
import { EventPerformanceChart } from '@/components/dashboard/EventPerformanceChart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { apiGet } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Analytics() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<'7d' | '30d' | '3m' | '6m' | '1y'>('6m');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; campaigns: number; events: number; newContacts: number }>>([]);
  const [eventsPerf, setEventsPerf] = useState<Array<{ name: string; invited: number }>>([]);

  const days = useMemo(() => {
    if (period === '7d') return 7;
    if (period === '30d') return 30;
    if (period === '3m') return 90;
    if (period === '6m') return 180;
    return 365;
  }, [period]);

  const load = async () => {
    setLoading(true);
    try {
      const [ov, sentSeries, eventsSeries, contactsSeries, eventsList] = await Promise.all([
        apiGet('/analytics/overview'),
        apiGet<any>(`/analytics/timeseries?metric=campaigns_sent&bucket=month&days=${days}`),
        apiGet<any>(`/analytics/timeseries?metric=events_created&bucket=month&days=${days}`),
        apiGet<any>(`/analytics/timeseries?metric=contacts_created&bucket=month&days=${days}`),
        apiGet<any[]>('/events'),
      ]);

      setOverview(ov);

      const byMonth: Record<string, { campaigns: number; events: number; newContacts: number }> = {};
      const ensure = (key: string) => {
        if (!byMonth[key]) byMonth[key] = { campaigns: 0, events: 0, newContacts: 0 };
        return byMonth[key];
      };

      const fmtMonth = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString('en-US', { month: 'short' });
      };

      (sentSeries?.series || []).forEach((r: any) => {
        const key = fmtMonth(r.bucket);
        ensure(key).campaigns += Number(r.value || 0);
      });
      (eventsSeries?.series || []).forEach((r: any) => {
        const key = fmtMonth(r.bucket);
        ensure(key).events += Number(r.value || 0);
      });
      (contactsSeries?.series || []).forEach((r: any) => {
        const key = fmtMonth(r.bucket);
        ensure(key).newContacts += Number(r.value || 0);
      });

      const months = Object.keys(byMonth);
      const data = months.map((m) => ({ month: m, ...byMonth[m] }));
      setMonthlyData(data);

      const perf = (eventsList || [])
        .slice(0, 8)
        .map((e: any) => ({ name: String(e.name || '').slice(0, 18) || `Event ${e.event_id}`, invited: Number(e.invited_count || 0) }));
      setEventsPerf(perf);
    } catch (e: any) {
      toast({ title: 'Failed to load analytics', description: e?.message ?? 'Unknown error', variant: 'destructive' });
      setOverview(null);
      setMonthlyData([]);
      setEventsPerf([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const channelPie = useMemo(() => {
    const rows = overview?.campaigns_by_channel || [];
    const colorMap: Record<string, string> = {
      email: 'hsl(var(--chart-1))',
      whatsapp: 'hsl(var(--chart-2))',
      unknown: 'hsl(var(--chart-3))',
    };
    return rows.map((r: any) => ({
      name: r.channel,
      value: Number(r.cnt || 0),
      color: colorMap[r.channel] || 'hsl(var(--chart-4))',
    }));
  }, [overview]);

  const statusPie = useMemo(() => {
    const rows = overview?.campaigns_by_status || [];
    const colorMap: Record<string, string> = {
      draft: 'hsl(var(--chart-3))',
      active: 'hsl(var(--chart-2))',
      completed: 'hsl(var(--chart-1))',
      cancelled: 'hsl(var(--chart-5))',
    };
    return rows.map((r: any) => ({
      name: r.status,
      value: Number(r.cnt || 0),
      color: colorMap[r.status] || 'hsl(var(--chart-4))',
    }));
  }, [overview]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track recorded outreach activity, contact growth, and event workload</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Time period" /></SelectTrigger><SelectContent><SelectItem value="7d">Last 7 days</SelectItem><SelectItem value="30d">Last 30 days</SelectItem><SelectItem value="3m">Last 3 months</SelectItem><SelectItem value="6m">Last 6 months</SelectItem><SelectItem value="1y">Last year</SelectItem></SelectContent></Select>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export Report</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Campaigns</CardDescription><CardTitle className="text-3xl">{loading ? '—' : (overview?.campaigns_total ?? 0)}</CardTitle></CardHeader><CardContent><div className="flex items-center gap-1 text-sm text-success"><TrendingUp className="h-4 w-4" /><span>Created in your org</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Contacts</CardDescription><CardTitle className="text-3xl">{loading ? '—' : (overview?.contacts ?? 0)}</CardTitle></CardHeader><CardContent><div className="flex items-center gap-1 text-sm text-success"><TrendingUp className="h-4 w-4" /><span>In your org</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Total Events</CardDescription><CardTitle className="text-3xl">{loading ? '—' : (overview?.events_total ?? overview?.events_upcoming ?? 0)}</CardTitle></CardHeader><CardContent><div className="flex items-center gap-1 text-sm text-muted-foreground"><CalendarIcon className="h-4 w-4" /><span>In your org</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Open Reminders</CardDescription><CardTitle className="text-3xl">{loading ? '—' : (overview?.reminders_open ?? 0)}</CardTitle></CardHeader><CardContent><div className="flex items-center gap-1 text-sm text-muted-foreground"><ListChecks className="h-4 w-4" /><span>Assigned to you / created by you</span></div></CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="communications">Communications</TabsTrigger><TabsTrigger value="events">Events</TabsTrigger></TabsList>
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-lg">Campaigns Created (Monthly)</CardTitle></CardHeader><CardContent><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} /><Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} /><Line type="monotone" dataKey="campaigns" name="Campaigns" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} /></LineChart></ResponsiveContainer></div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-lg">Contact Growth (Monthly)</CardTitle></CardHeader><CardContent><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} /><Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} /><Line type="monotone" dataKey="newContacts" name="New Contacts" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-2))' }} /></LineChart></ResponsiveContainer></div></CardContent></Card>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ContactTypeChart data={channelPie} title="Campaigns by Channel" />
            <ContactTypeChart data={statusPie} title="Campaigns by Status" />
          </div>
        </TabsContent>
        <TabsContent value="communications" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-lg">Outreach Activity</CardTitle><CardDescription>Recorded campaign creation count by month</CardDescription></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} /><Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} /><Bar dataKey="campaigns" name="Campaigns Created" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
            <ContactTypeChart data={channelPie} title="Distribution by Channel" />
          </div>
        </TabsContent>
        <TabsContent value="events" className="mt-6"><EventPerformanceChart data={eventsPerf} /></TabsContent>
      </Tabs>
    </div>
  );
}
