'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar, type CalendarProps } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AdminAuthGuard } from '@/components/admin-auth-guard';

type Schedule = {
  id: string;
  startAt: { seconds: number; nanoseconds: number; };
  endAt: { seconds: number; nanoseconds: number; };
  description: string;
};

const formSchema = z.object({
  description: z.string().min(5, 'Description must be at least 5 characters.'),
  dateRange: z.object({
    from: z.date({ required_error: 'A start date is required.' }),
    to: z.date({ required_error: 'An end date is required.' }),
  }),
});

function SchedulerContent() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const schedulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]);
  const { data: schedules, isLoading } = useCollection<Schedule>(schedulesQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      dateRange: { from: new Date(), to: new Date() },
    },
  });
  
  const selectedDayEvents = useMemo(() => {
    if (!schedules) return [];
    return schedules.filter(event => {
      const eventStartDate = startOfDay(new Date(event.startAt.seconds * 1000));
      const eventEndDate = startOfDay(new Date(event.endAt.seconds * 1000));
      const selectedDay = startOfDay(selectedDate);
      return selectedDay >= eventStartDate && selectedDay <= eventEndDate;
    });
  }, [schedules, selectedDate]);
  
  const calendarModifiers: CalendarProps['modifiers'] = useMemo(() => {
    const eventDays = schedules?.reduce((acc, event) => {
        let currentDate = new Date(event.startAt.seconds * 1000);
        const endDate = new Date(event.endAt.seconds * 1000);
        while (currentDate <= endDate) {
            acc.add(startOfDay(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return acc;
    }, new Set<Date>()) || new Set();

    return { scheduled: Array.from(eventDays) };
  }, [schedules]);

  const calendarModifiersClassNames: CalendarProps['modifiersClassNames'] = {
    scheduled: 'bg-primary/20 text-primary-foreground rounded-md',
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await addDoc(collection(firestore, 'schedules'), {
        description: values.description,
        startAt: values.dateRange.from,
        endAt: values.dateRange.to,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Event Scheduled', description: 'The new event has been added to the calendar.' });
      setIsFormOpen(false);
      form.reset();
    } catch (e) {
      console.error(e);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'schedules',
          operation: 'create',
          requestResourceData: values,
      }));
    } finally {
      setIsSaving(false);
    }
  }

  const handleDelete = async (eventId: string) => {
    if (!firestore) return;
    try {
        await deleteDoc(doc(firestore, 'schedules', eventId));
        toast({
            variant: 'destructive',
            title: 'Event Deleted',
            description: 'The scheduled event has been removed.',
        })
    } catch (e) {
         console.error(e);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `schedules/${eventId}`,
          operation: 'delete',
      }));
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline">Scheduler</h1>
          <p className="text-muted-foreground mt-1">Set schedules for exams, course availability, and other events.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2" />
          New Event
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
            <Card>
                <CardContent className="p-2 sm:p-4 md:p-6">
                 {isLoading ? (
                    <div className="flex justify-center items-center h-[300px]">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(day) => day && setSelectedDate(day)}
                        className="p-0 [&_td]:w-full"
                        modifiers={calendarModifiers}
                        modifiersClassNames={calendarModifiersClassNames}
                    />
                  )}
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Events for {format(selectedDate, 'PPP')}</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                     <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ): selectedDayEvents.length > 0 ? (
                    <div className="space-y-4">
                        {selectedDayEvents.map(event => (
                            <div key={event.id} className="p-3 bg-muted/50 rounded-lg flex justify-between items-start">
                                <p className="text-sm">{event.description}</p>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(event.id)}>
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No events scheduled for this day.</p>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule New Event</DialogTitle>
            <DialogDescription>Add a new event to the calendar. It can span multiple days.</DialogDescription>
          </DialogHeader>
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date Range</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn('w-full pl-3 text-left font-normal', !field.value.from && 'text-muted-foreground')}
                          >
                            {field.value.from ? (
                              field.value.to ? (
                                `${format(field.value.from, 'LLL dd, y')} - ${format(field.value.to, 'LLL dd, y')}`
                              ) : (
                                format(field.value.from, 'LLL dd, y')
                              )
                            ) : (
                              <span>Pick a date range</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={{ from: field.value.from, to: field.value.to }}
                          onSelect={(range) => field.onChange({ from: range?.from, to: range?.to })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Final examination period for ISO 9001 courses." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Event
                </Button>
              </DialogFooter>
            </form>
           </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SchedulerPage() {
  return (
    <AdminAuthGuard>
      <SchedulerContent />
    </AdminAuthGuard>
  )
}
