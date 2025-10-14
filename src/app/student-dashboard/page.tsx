
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { PlaceHolderImages, type ImagePlaceholder } from "@/lib/placeholder-images";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useIsClient } from "@/hooks/use-is-client";
import { Gem } from "lucide-react";

const featuredCourseIds = ['course-placeholder-1', 'course-placeholder-2', 'course-placeholder-3'];

// This filtering ensures that we don't have undefined values in the array
const featuredCourses: ImagePlaceholder[] = featuredCourseIds
  .map(id => PlaceHolderImages.find(img => img.id === id))
  .filter((course): course is ImagePlaceholder => course !== undefined);

export default function StudentDashboardPage() {
  const isClient = useIsClient();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline">Welcome to your learning journey, Student!</h1>
        <p className="text-muted-foreground">Here's a summary of your recent activity and available courses.</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold font-headline mb-4">Featured Courses</h2>
        {isClient && (
          <Carousel opts={{ align: "start", loop: true, }} className="w-full">
            <CarouselContent>
              {featuredCourses.map((course, index) => {
                return (
                  <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                    <Card className="overflow-hidden flex flex-col h-full">
                      <CardContent className="p-0 flex-grow flex flex-col">
                        <Image src={course.imageUrl} alt={course.description} width={600} height={400} className="w-full aspect-video object-cover" data-ai-hint={course.imageHint} />
                        <div className="p-4 flex-grow flex flex-col">
                          <h3 className="font-semibold">Course Title {index + 1}</h3>
                          <p className="text-sm text-muted-foreground mt-1 flex-grow">A brief description of the course content goes here.</p>
                          <div className="flex justify-between items-center mt-4">
                            <div className="flex items-center gap-2 font-bold text-lg text-primary">
                               <Gem className="h-5 w-5" />
                               <span>{course.priceInCab ?? 'N/A'}</span>
                            </div>
                            <Button>Enroll Now</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="ml-12" />
            <CarouselNext className="mr-12" />
          </Carousel>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Enroll in Courses</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-muted-foreground">Browse our catalog of courses to gain new qualifications and master certificates. Use your CAB tokens to enroll.</p>
          </CardContent>
          <div className="p-6 pt-0">
             <Link href="/student-dashboard/marketplace" passHref><Button className="w-full">Browse Marketplace</Button></Link>
          </div>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Take Your Exams</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-muted-foreground">After enrolling in a course, go to 'My Courses' to start your remotely proctored exam.</p>
          </CardContent>
          <div className="p-6 pt-0">
             <Link href="/student-dashboard/my-courses" passHref><Button className="w-full">Go to My Courses</Button></Link>
          </div>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>View Your Achievements</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-muted-foreground">Access your score reports, earned certificates, and official qualifications.</p>
          </CardContent>
          <div className="p-6 pt-0">
            <Link href="/student-dashboard/my-history" passHref><Button className="w-full">View My History</Button></Link>
          </div>
        </Card>
      </div>

    </div>
  );
}
