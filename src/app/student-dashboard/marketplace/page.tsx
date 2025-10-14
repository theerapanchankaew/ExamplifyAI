
'use client'

import { useMemoFirebase } from "@/firebase/provider";
import { useCollection } from "@/firebase";
import { useFirestore } from "@/firebase/provider";
import { collection } from "firebase/firestore";
import type { Course } from "@/types/course";
import { useCart } from "@/context/cart-context";
import { useMemo } from "react";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, Gem } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";

// In a real app, prices would come from the course data itself.
// Here we'll map them based on placeholder images for the prototype.
const coursePrices: Record<string, number> = {
    "course-placeholder-1": 100,
    "course-placeholder-2": 150,
    "course-placeholder-3": 120,
}

export default function MarketplacePage() {
  const firestore = useFirestore();
  const { addToCart, cartItems } = useCart();

  const coursesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'courses');
  }, [firestore]);

  const { data: courses, isLoading } = useCollection<Course>(coursesQuery);

  const getCourseImage = (index: number) => {
    const imageId = `course-placeholder-${(index % 3) + 1}`;
    const image = PlaceHolderImages.find(img => img.id === imageId);
    return image || PlaceHolderImages[2];
  };

  const isCourseInCart = (courseId: string) => {
    // This logic is simplified for the prototype. 
    // In a real app, you would match against a real course ID.
    // For now, we match against placeholder IDs derived from index.
    return cartItems.some(item => {
        const cartItemIndex = parseInt(item.id.split('-')[2], 10) - 1;
        return cartItemIndex === (courses?.findIndex(c => c.id === courseId) ?? -1) % 3;
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading available courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
       <div>
        <h1 className="text-3xl font-bold font-headline">Course Marketplace</h1>
        <p className="text-muted-foreground mt-1">Browse our catalog of courses to gain new qualifications. Use your CAB tokens to enroll.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {courses?.map((course, index) => {
          const courseImage = getCourseImage(index);
          const price = coursePrices[courseImage.id] || 0;
          const isInCart = isCourseInCart(course.id);
          
          return (
            <Card key={course.id} className="flex flex-col overflow-hidden">
              <div className="relative">
                <Image 
                  src={courseImage.imageUrl} 
                  alt={course.title} 
                  width={600} 
                  height={400} 
                  className="w-full aspect-video object-cover"
                  data-ai-hint={courseImage.imageHint}
                />
                <Badge variant="secondary" className="absolute top-2 right-2">{course.difficulty}</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-lg font-semibold line-clamp-2">{course.title}</CardTitle>
                {course.description && <CardDescription className="line-clamp-3 text-sm mt-1">{course.description}</CardDescription>}
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-end">
                <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center gap-2 font-bold text-lg text-primary">
                        <Gem className="h-5 w-5" />
                        <span>{price}</span>
                    </div>
                    <Button 
                      onClick={() => addToCart({ ...courseImage, description: course.title, id: course.id, priceInCab: price})} 
                      disabled={isInCart}
                    >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {isInCart ? 'In Cart' : 'Add to Cart'}
                    </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
