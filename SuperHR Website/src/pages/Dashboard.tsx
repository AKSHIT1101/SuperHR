import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Mail, TrendingUp, Bell, Wand2, Send, UserPlus, Loader2 } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { EngagementChart } from '@/components/dashboard/EngagementChart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type DashboardMetrics = {
  contacts: number;
  contacts_active: number;
  events_this_month: number;
  events_upcoming: number;
  emails_sent_this_month: number;
  campaigns_this_month: number;
};

type MonthlyActivityRow = {
  month: string;
  contacts: number;
  emails: number;
  events: number;
};

type DashboardApiResponse = {
  metrics: DashboardMetrics & Record<string, unknown>;
  monthly_activity: MonthlyActivityRow[];
};

type DashboardReminder = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
};

type DashboardEventPreview = {
  id: string;
  title: string;
  location: string;
  date: string;
  invitedCount: number;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [monthlyActivity, setMonthlyActivity] = useState<MonthlyActivityRow[]>([]);
  const [reminders, setReminders] = useState<DashboardReminder[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DashboardEventPreview[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const [dash, reminderRows, eventRows] = await Promise.all([
          apiGet<DashboardApiResponse>('/analytics/dashboard?months=6'),
          apiGet<any[]>('/reminders'),
          apiGet<any[]>('/events'),
        ]);

        if (cancelled) return;

        const m = dash.metrics as DashboardMetrics;
        setMetrics({
          contacts: Number(m.contacts ?? 0),
          contacts_active: Number(m.contacts_active ?? 0),
          events_this_month: Number(m.events_this_month ?? 0),
          events_upcoming: Number(m.events_upcoming ?? 0),
          emails_sent_this_month: Number(m.emails_sent_this_month ?? 0),
          campaigns_this_month: Number(m.campaigns_this_month ?? 0),
        });
        setMonthlyActivity(Array.isArray(dash.monthly_activity) ? dash.monthly_activity : []);

        const mappedReminders: DashboardReminder[] = (reminderRows || [])
          .filter((r) => !r.is_done)
          .slice(0, 8)
          .map((r) => {
            const dueAtIso = r.due_at ? new Date(r.due_at).toISOString() : '';
            const dueDate = dueAtIso ? dueAtIso.slice(0, 10) : new Date().toISOString().slice(0, 10);
            return {
              id: String(r.reminder_id),
              title: r.title,
              description: r.description || '',
              priority: 'medium',
              dueDate,
            };
          });
        setReminders(mappedReminders);

        const upcoming = (eventRows || [])
          .filter((e: any) => {
            if (e.status !== 'scheduled') return false;
            const dt = e.event_date ? new Date(e.event_date) : null;
            if (!dt || Number.isNaN(dt.getTime())) return false;
            return dt >= startOfToday;
          })
          .sort(
            (a: any, b: any) =>
              new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
          )
          .slice(0, 2)
          .map((e: any) => ({
            id: String(e.event_id),
            title: e.name,
            location: e.location || '',
            date: e.event_date,
            invitedCount: Number(e.invited_count || 0),
          }));
        setUpcomingEvents(upcoming);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Unknown error';
          toast({
            title: 'Failed to load dashboard',
            description: msg,
            variant: 'destructive',
          });
          setMetrics(null);
          setMonthlyActivity([]);
          setReminders([]);
          setUpcomingEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const priorityStyles = {
    high: 'border-l-destructive bg-destructive/5',
    medium: 'border-l-warning bg-warning/5',
    low: 'border-l-muted',
  };

  const displayTasks = useMemo(() => reminders.slice(0, 4), [reminders]);

  return (
    <div className="space-y-6 animate-fade-in">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading dashboard…
        </div>
      )}

      {/* Reminders Section */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            My Reminders
          </h3>
        </div>

        {displayTasks.length > 0 ? (
          <div className="space-y-2">
            {displayTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  'rounded-lg border border-l-4 p-3 transition-all hover:shadow-sm cursor-pointer',
                  priorityStyles[task.priority],
                )}
                onClick={() => navigate('/reminders')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{task.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {loading ? 'Loading reminders…' : 'No open reminders'}
          </div>
        )}

        <Button variant="link" size="sm" className="text-primary mt-2 p-0 h-auto" onClick={() => navigate('/reminders')}>
          View all reminders →
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><Wand2 className="h-4 w-4 text-primary" />What do you want to do today?</div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate('/contacts')}><UserPlus className="h-3.5 w-3.5" />Import contacts</Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate('/segments')}><Users className="h-3.5 w-3.5" />Build segment</Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate('/communications')}><Send className="h-3.5 w-3.5" />Launch campaign</Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        <MetricCard
          title="Total Contacts"
          value={metrics ? metrics.contacts.toLocaleString() : '—'}
          subtitle={metrics ? `${metrics.contacts_active.toLocaleString()} with email` : undefined}
          icon={Users}
          variant="primary"
        />
        <MetricCard
          title="Events This Month"
          value={metrics ? metrics.events_this_month : '—'}
          subtitle={metrics ? `${metrics.events_upcoming} upcoming` : undefined}
          icon={Calendar}
          variant="success"
        />
        <MetricCard
          title="Emails Sent"
          value={metrics ? metrics.emails_sent_this_month.toLocaleString() : '—'}
          subtitle="This month (email campaigns)"
          icon={Mail}
          variant="accent"
        />
        <MetricCard
          title="Campaigns This Month"
          value={metrics ? metrics.campaigns_this_month : '—'}
          subtitle="Created this month"
          icon={TrendingUp}
          variant="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <EngagementChart data={monthlyActivity} />
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Upcoming Events
              </h3>
              <Button variant="link" size="sm" className="text-primary" onClick={() => navigate('/events')}>View All</Button>
            </div>
            <div className="space-y-3">
              {upcomingEvents.length === 0 && !loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">No scheduled upcoming events</p>
              ) : (
                upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/events')}
                  >
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs text-primary font-medium">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {new Date(event.date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{event.title}</h4>
                      <p className="text-xs text-muted-foreground truncate">{event.location || '—'}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0">{event.invitedCount} invited</Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
