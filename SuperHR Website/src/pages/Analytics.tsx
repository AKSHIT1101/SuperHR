import { Download, Calendar, TrendingUp, TrendingDown, Users, Mail, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EngagementChart } from '@/components/dashboard/EngagementChart';
import { AlumniTypeChart } from '@/components/dashboard/AlumniTypeChart';
import { EventPerformanceChart } from '@/components/dashboard/EventPerformanceChart';
import { mockMetrics } from '@/data/mockData';
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
} from 'recharts';

const monthlyData = [
  { month: 'Jul', emails: 280, events: 2, newAlumni: 15, engagement: 58 },
  { month: 'Aug', emails: 320, events: 3, newAlumni: 22, engagement: 62 },
  { month: 'Sep', emails: 380, events: 4, newAlumni: 18, engagement: 65 },
  { month: 'Oct', emails: 420, events: 3, newAlumni: 25, engagement: 68 },
  { month: 'Nov', emails: 390, events: 2, newAlumni: 12, engagement: 64 },
  { month: 'Dec', emails: 280, events: 1, newAlumni: 8, engagement: 55 },
  { month: 'Jan', emails: 450, events: 3, newAlumni: 20, engagement: 72 },
];

export default function Analytics() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Track engagement, outreach metrics, and alumni insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="6m">
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
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Emails Sent</CardDescription>
            <CardTitle className="text-3xl">2,520</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-success">
              <TrendingUp className="h-4 w-4" />
              <span>+12.5% from last period</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Open Rate</CardDescription>
            <CardTitle className="text-3xl">78.2%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-success">
              <TrendingUp className="h-4 w-4" />
              <span>+5.3% from last period</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Events Conducted</CardDescription>
            <CardTitle className="text-3xl">18</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-destructive">
              <TrendingDown className="h-4 w-4" />
              <span>-2 from last period</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alumni Engaged</CardDescription>
            <CardTitle className="text-3xl">892</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-success">
              <TrendingUp className="h-4 w-4" />
              <span>+8.7% from last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different report types */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <EngagementChart />
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="engagement"
                        name="Engagement %"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <AlumniTypeChart />
            <EventPerformanceChart />
          </div>
        </TabsContent>

        <TabsContent value="communications" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Email Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar
                        dataKey="emails"
                        name="Emails Sent"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Channel Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 pt-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Email
                      </span>
                      <span className="font-semibold">78% open rate</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: '78%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-success" />
                        WhatsApp
                      </span>
                      <span className="font-semibold">92% read rate</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-success"
                        style={{ width: '92%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-accent" />
                        Event Invites
                      </span>
                      <span className="font-semibold">65% response rate</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: '65%' }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <EventPerformanceChart />
        </TabsContent>

        <TabsContent value="engagement" className="mt-6">
          <EngagementChart />
        </TabsContent>
      </Tabs>
    </div>
  );
}
