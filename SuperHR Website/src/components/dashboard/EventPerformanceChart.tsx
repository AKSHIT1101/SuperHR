import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { mockMetrics } from '@/data/mockData';

export function EventPerformanceChart() {
  return (
    <div className="chart-container">
      <h3 className="font-semibold mb-4">Event Performance</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mockMetrics.eventPerformance} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend />
            <Bar
              dataKey="invited"
              name="Invited"
              fill="hsl(var(--chart-1))"
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="confirmed"
              name="Confirmed"
              fill="hsl(var(--chart-2))"
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="attended"
              name="Attended"
              fill="hsl(var(--chart-3))"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
