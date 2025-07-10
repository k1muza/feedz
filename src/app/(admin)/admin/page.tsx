
import { ArrowDown, ArrowUp, BarChart, CircleUser, MoreHorizontal, Package } from 'lucide-react';
import { OverviewChart } from '@/components/admin/OverviewChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PolarAngleAxis, PolarGrid, RadialBar, RadialBarChart } from 'recharts';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <CircleUser className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">3,782</div>
            <div className="flex items-center text-xs text-green-600">
              <ArrowUp className="h-3 w-3 mr-1" />
              <span>11.01%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">5,359</div>
            <div className="flex items-center text-xs text-red-600">
              <ArrowDown className="h-3 w-3 mr-1" />
              <span>9.05%</span>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Target</CardTitle>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 items-center gap-4">
              <div className="relative flex items-center justify-center h-40">
                <ChartContainer
                  config={{
                    target: { color: "hsl(var(--primary))" },
                  }}
                  className="mx-auto aspect-square h-full"
                >
                  <RadialBarChart
                    data={[{ name: "target", value: 75.55, fill: "var(--color-target)" }]}
                    startAngle={-90}
                    endAngle={90}
                    innerRadius="80%"
                    outerRadius="100%"
                    barSize={12}
                    cy="100%"
                  >
                    <PolarGrid gridType="circle" radialLines={false} stroke="none" />
                    <RadialBar
                      background
                      dataKey="value"
                      cornerRadius={6}
                    />
                  </RadialBarChart>
                </ChartContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-6">
                  <span className="text-3xl font-bold text-center">75.55%</span>
                  <div className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-full mt-1">
                    +10%
                  </div>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <p className="text-sm text-muted-foreground">You earn $3287 today, it's higher than last month. Keep up your good work!</p>
                <div className="grid grid-cols-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Target</p>
                    <p className="font-bold flex items-center justify-center">$20K <ArrowDown className="h-3 w-3 text-red-500 ml-1" /></p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="font-bold flex items-center justify-center">$20K <ArrowUp className="h-3 w-3 text-green-500 ml-1" /></p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Today</p>
                    <p className="font-bold flex items-center justify-center">$20K <ArrowUp className="h-3 w-3 text-green-500 ml-1" /></p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Monthly Sales</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <OverviewChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
