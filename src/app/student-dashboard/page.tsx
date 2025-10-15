
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { PlaceHolderImages, type ImagePlaceholder } from "@/lib/placeholder-images";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useIsClient } from "@/hooks/use-is-client";
import { Gem, Loader2, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, limit, query } from "firebase/firestore";
import type { Course } from "@/types/course";
import type { CartItem } from "@/context/cart-context";


// In a real app, prices would come from the course data itself.
const getCoursePrice = (courseId: string): number => {
    // Simple hash function to get a deterministic price
    let hash = 0;
    for (let i = 0; i < courseId.length; i++) {
        const char = courseId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; 
    }
    const prices = [100, 120, 150, 180, 200];
    return prices[Math.abs(hash) % prices.length];
}

const getCourseImage = (index: number) => {
    const imageId = `course-placeholder-${(index % 3) + 1}`;
    const image = PlaceHolderImages.find(img => img.id === imageId);
    return image || PlaceHolderImages[2];
};


export default function StudentDashboardPage() {
  const isClient = useIsClient();
  const { addToCart, cartItems } = useCart();
  const firestore = useFirestore();

  const coursesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Fetch the first 3 courses to be featured
    return query(collection(firestore, 'courses'), limit(3));
  }, [firestore]);

  const { data: featuredCourses, isLoading } = useCollection<Course>(coursesQuery);

  const isCourseInCart = (courseId: string) => {
    return cartItems.some(item => item.id === courseId);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline">Welcome to your learning journey, Student!</h1>
        <p className="text-muted-foreground">Here's a summary of your recent activity and available courses.</p>
      </div>

      <div>
        <h2 className="text-2xl font-bold font-headline mb-4">Featured Courses</h2>
        {isLoading ? (
          <div className="flex h-[250px] w-full items-center justify-center rounded-lg border-2 border-dashed">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : isClient && featuredCourses && featuredCourses.length > 0 ? (
          <Carousel opts={{ align: "start", loop: featuredCourses.length > 2 }} className="w-full">
            <CarouselContent>
              {featuredCourses.map((course, index) => {
                 const courseImage = getCourseImage(index);
                 const price = getCoursePrice(course.id);
                 const isInCart = isCourseInCart(course.id);
                 const cartItem: CartItem = {
                     ...course,
                     imageUrl: courseImage.imageUrl,
                     imageHint: courseImage.imageHint,
                     priceInCab: price,
                 }

                return (
                  <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                    <Card className="overflow-hidden flex flex-col h-full">
                      <CardContent className="p-0 flex-grow flex flex-col">
                        <Image src={courseImage.imageUrl} alt={course.title} width={600} height={400} className="w-full aspect-video object-cover" data-ai-hint={courseImage.imageHint} />
                        <div className="p-4 flex-grow flex flex-col">
                          <h3 className="font-semibold">{course.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1 flex-grow">{course.description || "A brief description of the course content goes here."}</p>
                          <div className="flex justify-between items-center mt-4">
                            <div className="flex items-center gap-2 font-bold text-lg text-primary">
                               <Gem className="h-5 w-5" />
                               <span>{price}</span>
                            </div>
                            <Button onClick={() => addToCart(cartItem)} disabled={isInCart}>
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                {isInCart ? "In Cart" : "Add to Cart"}
                            </Button>
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
        ) : (
            <div className="flex h-[250px] w-full items-center justify-center rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">No featured courses available right now.</p>
            </div>
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
