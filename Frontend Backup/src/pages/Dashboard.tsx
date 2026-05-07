import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Mail, TrendingUp, AlertTriangle, Sparkles, Bell, User, Wand2, Send, UserPlus } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AIInsightCard } from '@/components/dashboard/AIInsightCard';
import { EngagementChart } from '@/components/dashboard/EngagementChart';
import { ContactTypeChart } from '@/components/dashboard/ContactTypeChart';
import { EventPerformanceChart } from '@/components/dashboard/EventPerformanceChart';
import { mockMetrics, mockTasks, mockInsights, mockEvents } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const [reminderTab, setReminderTab] = useState<'ai' | 'self'>('self');

  const allTasks = mockTasks.filter((t) => t.status !== 'completed');
  const aiTasks = allTasks.filter((t) => t.isAIGenerated).slice(0, 4);
  const selfTasks = allTasks.filter((t) => !t.isAIGenerated).slice(0, 4);
  const displayTasks = reminderTab === 'ai' ? aiTasks : selfTasks;

  const activeInsights = mockInsights.filter((i) => !i.dismissed).slice(0, 3);
  const upcomingEvents = mockEvents.filter((e) => e.status === 'scheduled').slice(0, 2);

  const priorityStyles = {
    high: 'border-l-destructive bg-destructive/5',
    medium: 'border-l-warning bg-warning/5',
    low: 'border-l-muted',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alert Banner */}
      <div className="alert-banner rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <div>
            <span className="font-medium">Action Required:</span>
            <span className="ml-1 text-muted-foreground">
              No emails sent in the past 7 days. 15 contacts are due for follow-up.
            </span>
          </div>
        </div>
        <Button size="sm" variant="outline" className="shrink-0">View Details</Button>
      </div>

      {/* Reminders Section */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            My Reminders
          </h3>
          <Tabs value={reminderTab} onValueChange={(v) => setReminderTab(v as 'ai' | 'self')}>
            <TabsList className="h-8">
              <TabsTrigger value="self" className="text-xs gap-1 h-7">
                <User className="h-3 w-3" />
                Self ({selfTasks.length})
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs gap-1 h-7">
                <Sparkles className="h-3 w-3" />
                AI ({aiTasks.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {displayTasks.length > 0 ? (
          <div className="space-y-2">
            {displayTasks.map((task) => (
              <div
                key={task.id}
                className={cn('rounded-lg border border-l-4 p-3 transition-all hover:shadow-sm cursor-pointer', priorityStyles[task.priority])}
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
            No {reminderTab === 'ai' ? 'AI-generated' : 'self-created'} reminders
          </div>
        )}
        
        <Button variant="link" size="sm" className="text-primary mt-2 p-0 h-auto" onClick={() => navigate('/reminders')}>
          View all reminders →
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><Wand2 className="h-4 w-4 text-primary" />What do you want to do today?</div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input placeholder="e.g., Create a WhatsApp campaign for high-engagement leads in Mumbai and draft follow-ups" className="flex-1" />
          <Button className="gap-2"><Sparkles className="h-4 w-4" />Run with AI</Button>
        </div>
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
          value={mockMetrics.totalContacts.toLocaleString()}
          subtitle={`${mockMetrics.activeContacts} active`}
          icon={Users}
          trend={{ value: 5.2, isPositive: true }}
          variant="primary"
        />
        <MetricCard
          title="Events This Month"
          value={mockMetrics.eventsThisMonth}
          subtitle={`${mockMetrics.upcomingEvents} upcoming`}
          icon={Calendar}
          variant="success"
        />
        <MetricCard
          title="Emails Sent"
          value={mockMetrics.emailsSentThisMonth}
          subtitle="This month"
          icon={Mail}
          trend={{ value: 12.5, isPositive: true }}
          variant="accent"
        />
        <MetricCard
          title="Response Rate"
          value={`${mockMetrics.avgResponseRate}%`}
          subtitle="Average"
          icon={TrendingUp}
          trend={{ value: -2.3, isPositive: false }}
          variant="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <EngagementChart data={mockMetrics.engagementTrend} />
          <div className="grid gap-6 sm:grid-cols-2">
            <ContactTypeChart title="Contacts by Type" data={mockMetrics.contactsByType} />
            <EventPerformanceChart data={mockMetrics.eventPerformance} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary ai-pulse"></span>
                AI Insights
              </h3>
              <Button variant="link" size="sm" className="text-primary">View All</Button>
            </div>
            <div className="space-y-3">
              {activeInsights.map((insight) => (
                <AIInsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Upcoming Events
              </h3>
              <Button variant="link" size="sm" className="text-primary" onClick={() => navigate('/events')}>View All</Button>
            </div>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
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
                    <p className="text-xs text-muted-foreground truncate">{event.location}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">{event.confirmedCount} confirmed</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
