'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig
} from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, BookOpen, CheckCircle, Percent, Activity } from "lucide-react"
import type { ExamAttempt } from "@/types"

const stats = [
  { title: "Total Users", value: "1,254", icon: Users, change: "+12.5%" },
  { title: "Total Courses", value: "89", icon: BookOpen, change: "+5" },
  { title: "Attempts Today", value: "342", icon: CheckCircle, change: "-8.2%" },
  { title: "Pass Rate", value: "87.5%", icon: Percent, change: "+1.5%" },
];

const chartData = [
  { date: "7 days ago", attempts: 210, passes: 180 },
  { date: "6 days ago", attempts: 250, passes: 215 },
  { date: "5 days ago", attempts: 230, passes: 205 },
  { date: "4 days ago", attempts: 280, passes: 250 },
  { date: "3 days ago", attempts: 310, passes: 270 },
  { date: "2 days ago", attempts: 290, passes: 260 },
  { date: "Yesterday", attempts: 342, passes: 301 },
];

const chartConfig = {
  attempts: {
    label: "Attempts",
    color: "hsl(var(--chart-1))",
  },
  passes: {
    label: "Passes",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const recentAttempts: ExamAttempt[] = [
  { id: "1", user: { name: "John Doe", avatarUrl: "https://picsum.photos/seed/10/40/40" }, course: { title: "ISO 9001 Fundamentals" }, score: 92, status: "Passed", timestamp: new Date(Date.now() - 3600000 * 1) },
  { id: "2", user: { name: "Jane Smith", avatarUrl: "https://picsum.photos/seed/11/40/40" }, course: { title: "Advanced Auditing" }, score: 78, status: "Passed", timestamp: new Date(Date.now() - 3600000 * 2) },
  { id: "3", user: { name: "Mike Johnson", avatarUrl: "https://picsum.photos/seed/12/40/40" }, course: { title: "Safety Regulations" }, score: 55, status: "Failed", timestamp: new Date(Date.now() - 3600000 * 3) },
  { id: "4", user: { name: "Emily White", avatarUrl: "https://picsum.photos/seed/13/40/40" }, course: { title: "ISO 9001 Fundamentals" }, score: 88, status: "Passed", timestamp: new Date(Date.now() - 3600000 * 4) },
  { id: "5", user: { name: "Chris Green", avatarUrl: "https://picsum.photos/seed/14/40/40" }, course: { title: "IAF/ISIC Standards" }, score: 95, status: "Passed", timestamp: new Date(Date.now() - 3600000 * 5) },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-headline">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change} from last period</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="attempts" type="monotone" stroke="var(--color-attempts)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-attempts)", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line dataKey="passes" type="monotone" stroke="var(--color-passes)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-passes)", strokeWidth: 2 }} activeDot={{ r: 6 }}/>
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Exam Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Examinee</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={attempt.user.avatarUrl} alt={attempt.user.name} />
                            <AvatarFallback>{attempt.user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{attempt.user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><div className="truncate w-40">{attempt.course.title}</div></TableCell>
                      <TableCell className="text-right font-code">{attempt.score}%</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={attempt.status === 'Passed' ? 'secondary' : 'destructive'}>
                          {attempt.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
