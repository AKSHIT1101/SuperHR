import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Mail, TrendingUp, Clock, AlertTriangle, Sparkles, Bell, User } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AIInsightCard } from '@/components/dashboard/AIInsightCard';
import { TaskCard } from '@/components/dashboard/TaskCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { EngagementChart } from '@/components/dashboard/EngagementChart';
import { AlumniTypeChart } from '@/components/dashboard/AlumniTypeChart';
import { EventPerformanceChart } from '@/components/dashboard/EventPerformanceChart';
import { mockMetrics, mockTasks, mockInsights, mockEvents } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
              No emails sent in the past 7 days. 15 alumni are due for follow-up.
            </span>
          </div>
        </div>
        <Button size="sm" variant="outline" className="shrink-0">
          View Details
        </Button>
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
                className={cn(
                  'rounded-lg border border-l-4 p-3 transition-all hover:shadow-sm cursor-pointer',
                  priorityStyles[task.priority]
                )}
                onClick={() => navigate('/reminders')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{task.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {task.description}
                    </p>
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
        
        <Button
          variant="link"
          size="sm"
          className="text-primary mt-2 p-0 h-auto"
          onClick={() => navigate('/reminders')}
        >
          View all reminders →
        </Button>
      </div>

      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, Arun. Here's your alumni overview.</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        <MetricCard
          title="Total Alumni"
          value={mockMetrics.totalAlumni.toLocaleString()}
          subtitle={`${mockMetrics.activeAlumni} active`}
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
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          <EngagementChart />
          <div className="grid gap-6 sm:grid-cols-2">
            <AlumniTypeChart />
            <EventPerformanceChart />
          </div>
        </div>

        {/* Right Column - Insights & Events */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Upcoming Events
              </h3>
              <Button variant="link" size="sm" className="text-primary" onClick={() => navigate('/events')}>
                View All
              </Button>
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
                  <Badge variant="outline" className="shrink-0">
                    {event.confirmedCount} confirmed
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
