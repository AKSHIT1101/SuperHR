import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  TrendingUp,
  Calendar as CalendarIcon,
  ListChecks,
  Mail,
  MessageCircle,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContactTypeChart } from '@/components/dashboard/ContactTypeChart';
import { EventPerformanceChart } from '@/components/dashboard/EventPerformanceChart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { apiGet } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { CampaignDetailDialog } from '@/components/dialogs/CampaignDetailDialog';

type DailyRow = {
  date: string;
  label: string;
  campaignsCreated: number;
  campaignsSent: number;
  emailsSent: number;
  whatsappSent: number;
  newContacts: number;
  events: number;
};

type RecentCampaign = {
  id: number;
  name: string;
  channel: 'email' | 'whatsapp' | 'unknown';
  status: string;
  sent: number;
  date: string;
};

const dayInMs = 24 * 60 * 60 * 1000;

function isoDay(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  // Use UTC date so day-bucketed data lines up regardless of viewer tz.
  return d.toISOString().slice(0, 10);
}

function buildDailyRange(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    out.push(isoDay(new Date(today.getTime() - i * dayInMs)));
  }
  return out;
}

function formatDayLabel(iso: string, totalDays: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  if (totalDays > 90) {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Analytics() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<'7d' | '30d' | '3m' | '6m' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [dailyData, setDailyData] = useState<DailyRow[]>([]);
  const [eventsPerf, setEventsPerf] = useState<Array<{ name: string; invited: number }>>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [showCampaignDetail, setShowCampaignDetail] = useState(false);

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
      const [
        ov,
        createdSeries,
        sentSeries,
        emailsSeries,
        waSeries,
        eventsSeries,
        contactsSeries,
        eventsList,
        campaignsList,
      ] = await Promise.all([
        apiGet<any>('/analytics/overview'),
        apiGet<any>(`/analytics/timeseries?metric=campaigns_created&bucket=day&days=${days}`),
        apiGet<any>(`/analytics/timeseries?metric=campaigns_sent&bucket=day&days=${days}`),
        apiGet<any>(`/analytics/timeseries?metric=emails_sent&bucket=day&days=${days}`),
        apiGet<any>(`/analytics/timeseries?metric=whatsapp_sent&bucket=day&days=${days}`),
        apiGet<any>(`/analytics/timeseries?metric=events_created&bucket=day&days=${days}`),
        apiGet<any>(`/analytics/timeseries?metric=contacts_created&bucket=day&days=${days}`),
        apiGet<any[]>('/events'),
        apiGet<any[]>('/campaigns'),
      ]);

      setOverview(ov);

      const range = buildDailyRange(days);
      const byDay: Record<string, DailyRow> = {};
      for (const iso of range) {
        byDay[iso] = {
          date: iso,
          label: formatDayLabel(iso, days),
          campaignsCreated: 0,
          campaignsSent: 0,
          emailsSent: 0,
          whatsappSent: 0,
          newContacts: 0,
          events: 0,
        };
      }

      const apply = (series: any, field: keyof DailyRow) => {
        (series?.series || []).forEach((r: any) => {
          const iso = isoDay(r.bucket);
          if (!iso || !byDay[iso]) return;
          (byDay[iso] as any)[field] =
            ((byDay[iso] as any)[field] || 0) + Number(r.value || 0);
        });
      };

      apply(createdSeries, 'campaignsCreated');
      apply(sentSeries, 'campaignsSent');
      apply(emailsSeries, 'emailsSent');
      apply(waSeries, 'whatsappSent');
      apply(eventsSeries, 'events');
      apply(contactsSeries, 'newContacts');

      setDailyData(range.map((iso) => byDay[iso]));

      const perf = (eventsList || [])
        .slice(0, 8)
        .map((e: any) => ({
          name: String(e.name || '').slice(0, 18) || `Event ${e.event_id}`,
          invited: Number(e.invited_count || 0),
        }));
      setEventsPerf(perf);

      const recent: RecentCampaign[] = (campaignsList || [])
        .slice(0, 8)
        .map((c: any) => {
          const channelRaw = String(c.channel || '').toLowerCase();
          const channel: RecentCampaign['channel'] =
            channelRaw === 'email' || channelRaw === 'whatsapp' ? channelRaw : 'unknown';
          const dateIso = c.sent_at || c.created_at || c.scheduled_at || null;
          return {
            id: Number(c.campaign_id),
            name: String(c.name || `Campaign ${c.campaign_id}`),
            channel,
            status: String(c.status || 'draft'),
            sent: Number(c.sent_count || c.contact_count || 0),
            date: dateIso ? new Date(dateIso).toLocaleDateString() : '—',
          };
        });
      setRecentCampaigns(recent);
    } catch (e: any) {
      toast({
        title: 'Failed to load analytics',
        description: e?.message ?? 'Unknown error',
        variant: 'destructive',
      });
      setOverview(null);
      setDailyData([]);
      setEventsPerf([]);
      setRecentCampaigns([]);
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

  const messagesSent = Number(overview?.messages_sent || 0);
  const emailsSent = Number(overview?.emails_sent || 0);
  const whatsappSent = Number(overview?.whatsapp_sent || 0);

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
  } as const;
  const axisTick = { fill: 'hsl(var(--foreground))', fontSize: 12 } as const;

  // Let recharts pick which ticks to render based on actual rendered width.
  // minTickGap is the minimum *pixel* gap between two labels — generous so they never overlap.
  const xAxisProps = {
    dataKey: 'label',
    tick: axisTick,
    interval: 'preserveStartEnd' as const,
    minTickGap: 36,
    angle: -28,
    textAnchor: 'end' as const,
    height: 56,
    tickMargin: 8,
  };
  const chartMargin = { top: 8, right: 12, bottom: 8, left: 0 };

  const statusBadgeClass: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-info/10 text-info',
    completed: 'bg-secondary text-secondary-foreground',
    cancelled: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Track recorded outreach activity, contact growth, and event workload
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Campaigns</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? '—' : (overview?.campaigns_total ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-success">
              <TrendingUp className="h-4 w-4" />
              <span>Created in your org</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Messages Sent</CardDescription>
            <CardTitle className="text-3xl">{loading ? '—' : messagesSent}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4 text-primary" />
                {emailsSent}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4 text-success" />
                {whatsappSent}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Events</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? '—' : (overview?.events_total ?? overview?.events_upcoming ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>In your org</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Reminders</CardDescription>
            <CardTitle className="text-3xl">{loading ? '—' : (overview?.reminders_open ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ListChecks className="h-4 w-4" />
              <span>Assigned to / created by you</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campaigns Created (Daily)</CardTitle>
                <CardDescription>Counts every campaign saved, including drafts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis {...xAxisProps} />
                      <YAxis tick={axisTick} allowDecimals={false} width={32} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="campaignsCreated"
                        name="Created"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="campaignsSent"
                        name="Sent"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--chart-2))', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Growth (Daily)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis {...xAxisProps} />
                      <YAxis tick={axisTick} allowDecimals={false} width={32} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey="newContacts"
                        name="New Contacts"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--chart-2))', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ContactTypeChart data={channelPie} title="Campaigns by Channel" />
            <ContactTypeChart data={statusPie} title="Campaigns by Status" />
          </div>
        </TabsContent>

        <TabsContent value="communications" className="space-y-6 mt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Messages Sent</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Send className="h-6 w-6 text-primary" />
                  {loading ? '—' : messagesSent}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Emails Sent</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Mail className="h-6 w-6 text-primary" />
                  {loading ? '—' : emailsSent}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>WhatsApp Sent</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <MessageCircle className="h-6 w-6 text-success" />
                  {loading ? '—' : whatsappSent}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Messages Sent (Daily)
                </CardTitle>
                <CardDescription>Total recipients reached per day, by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis {...xAxisProps} />
                      <YAxis tick={axisTick} allowDecimals={false} width={32} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar
                        dataKey="emailsSent"
                        name="Emails"
                        stackId="msgs"
                        fill="hsl(var(--primary))"
                      />
                      <Bar
                        dataKey="whatsappSent"
                        name="WhatsApp"
                        stackId="msgs"
                        fill="hsl(var(--chart-2))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campaigns Created (Daily)</CardTitle>
                <CardDescription>Recorded campaign creation count by day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis {...xAxisProps} />
                      <YAxis tick={axisTick} allowDecimals={false} width={32} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar
                        dataKey="campaignsCreated"
                        name="Campaigns Created"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <ContactTypeChart data={channelPie} title="Distribution by Channel" />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Campaigns</CardTitle>
              <CardDescription>Click any campaign to view details and recipients</CardDescription>
            </CardHeader>
            <CardContent>
              {recentCampaigns.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {loading ? 'Loading…' : 'No campaigns yet.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-2 pr-3 font-medium">Campaign</th>
                        <th className="py-2 pr-3 font-medium">Channel</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 pr-3 font-medium text-right">Sent</th>
                        <th className="py-2 pr-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCampaigns.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedCampaignId(c.id);
                            setShowCampaignDetail(true);
                          }}
                        >
                          <td className="py-3 pr-3 font-medium">{c.name}</td>
                          <td className="py-3 pr-3">
                            <span className="inline-flex items-center gap-1.5">
                              {c.channel === 'email' ? (
                                <Mail className="h-4 w-4 text-primary" />
                              ) : c.channel === 'whatsapp' ? (
                                <MessageCircle className="h-4 w-4 text-success" />
                              ) : (
                                <Send className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="capitalize">{c.channel}</span>
                            </span>
                          </td>
                          <td className="py-3 pr-3">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs capitalize ${statusBadgeClass[c.status] || statusBadgeClass.draft
                                }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 pr-3 text-right tabular-nums">{c.sent}</td>
                          <td className="py-3 pr-3 text-muted-foreground">{c.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <EventPerformanceChart data={eventsPerf} />
        </TabsContent>
      </Tabs>

      <CampaignDetailDialog
        campaignId={selectedCampaignId}
        open={showCampaignDetail}
        onOpenChange={(open) => {
          setShowCampaignDetail(open);
          if (!open) setSelectedCampaignId(null);
        }}
      />
    </div>
  );
}
