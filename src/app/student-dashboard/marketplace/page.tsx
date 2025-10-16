
'use client'

import { useMemoFirebase } from "@/firebase/provider";
import { useCollection } from "@/firebase";
import { useFirestore } from "@/firebase/provider";
import { collection } from "firebase/firestore";
import type { Course } from "@/types/course";
import { useCart } from "@/context/cart-context";
import { useState, useMemo } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, Gem, Search, SlidersHorizontal } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import type { CartItem } from "@/context/cart-context";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const DIFFICULTIES: Course['difficulty'][] = ['Beginner', 'Intermediate', 'Expert'];

// In a real app, prices would come from the course data itself.
const getCoursePrice = (courseId: string): number => {
    let hash = 0;
    for (let i = 0; i < courseId.length; i++) {
        const char = courseId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; 
    }
    const prices = [100, 120, 150, 180, 200];
    return prices[Math.abs(hash) % prices.length];
}

function MarketplaceContent() {
  const firestore = useFirestore();
  const { addToCart, cartItems } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<Course['difficulty']>>(new Set());

  const coursesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'courses');
  }, [firestore]);

  const { data: courses, isLoading } = useCollection<Course>(coursesQuery);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    return courses.filter(course => {
      const searchTermLower = searchTerm.toLowerCase();
      const titleMatch = course.title.toLowerCase().includes(searchTermLower);
      const descriptionMatch = course.description?.toLowerCase().includes(searchTermLower) ?? false;
      const difficultyMatch = selectedDifficulties.size === 0 || selectedDifficulties.has(course.difficulty);
      return (titleMatch || descriptionMatch) && difficultyMatch;
    });
  }, [courses, searchTerm, selectedDifficulties]);

  const getCourseImage = (index: number) => {
    const imageId = `course-placeholder-${(index % 3) + 1}`;
    const image = PlaceHolderImages.find(img => img.id === imageId);
    return image || PlaceHolderImages[2];
  };

  const isCourseInCart = (courseId: string) => {
    return cartItems.some(item => item.id === courseId);
  };
  
  const handleDifficultyChange = (difficulty: Course['difficulty']) => {
    setSelectedDifficulties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(difficulty)) {
        newSet.delete(difficulty);
      } else {
        newSet.add(difficulty);
      }
      return newSet;
    });
  }

  const filtersContent = (
    <div className="flex flex-col gap-6">
        <div>
            <h3 className="text-lg font-semibold mb-3">Difficulty</h3>
            <div className="flex flex-col gap-3">
                {DIFFICULTIES.map(difficulty => (
                    <div key={difficulty} className="flex items-center gap-3">
                        <Checkbox 
                            id={`filter-${difficulty}`} 
                            checked={selectedDifficulties.has(difficulty)}
                            onCheckedChange={() => handleDifficultyChange(difficulty)}
                        />
                        <Label htmlFor={`filter-${difficulty}`} className="font-normal">{difficulty}</Label>
                    </div>
                ))}
            </div>
        </div>
        <Button 
            variant="ghost" 
            onClick={() => setSelectedDifficulties(new Set())} 
            disabled={selectedDifficulties.size === 0}
            className="justify-start p-0 h-auto"
        >
            Clear all filters
        </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Course Marketplace</h1>
        <p className="text-muted-foreground mt-1">Browse our catalog to gain new qualifications. Use your CAB tokens to enroll.</p>
      </div>

       <Tabs defaultValue="courses">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <TabsList>
                <TabsTrigger value="courses">Full Courses</TabsTrigger>
                <TabsTrigger value="modules" disabled>Individual Modules</TabsTrigger>
            </TabsList>
            <div className="relative flex-1 md:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search courses..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <TabsContent value="courses" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
                {/* Desktop Filters */}
                <div className="hidden md:block">
                     <h2 className="text-xl font-semibold mb-4">Filters</h2>
                    {filtersContent}
                </div>
                
                {/* Mobile Filters */}
                <div className="md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline"><SlidersHorizontal className="mr-2"/>Filters</Button>
                        </SheetTrigger>
                        <SheetContent side="left">
                            <SheetHeader>
                                <SheetTitle>Filters</SheetTitle>
                            </SheetHeader>
                            <div className="py-6">{filtersContent}</div>
                        </SheetContent>
                    </Sheet>
                </div>

                {isLoading ? (
                    <div className="flex h-[40vh] w-full items-center justify-center col-span-1">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                        {filteredCourses.length > 0 ? filteredCourses.map((course, index) => {
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
                                <Card key={course.id} className="flex flex-col overflow-hidden group">
                                <div className="relative overflow-hidden">
                                    <Image 
                                    src={courseImage.imageUrl} 
                                    alt={course.title} 
                                    width={600} 
                                    height={400} 
                                    className="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-105"
                                    data-ai-hint={courseImage.imageHint}
                                    />
                                </div>
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold line-clamp-2">{course.title}</CardTitle>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <Badge variant="secondary">{course.difficulty}</Badge>
                                        <Badge variant="outline">{course.competency}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col justify-end">
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="flex items-center gap-2 font-bold text-lg text-primary">
                                            <Gem className="h-5 w-5" />
                                            <span>{price}</span>
                                        </div>
                                        <Button 
                                        onClick={() => addToCart(cartItem)} 
                                        disabled={isInCart}
                                        >
                                            <ShoppingCart className="mr-2 h-4 w-4" />
                                            {isInCart ? 'In Cart' : 'Add to Cart'}
                                        </Button>
                                    </div>
                                </CardContent>
                                </Card>
                            );
                            }) : (
                                <div className="col-span-full flex flex-col items-center justify-center h-full min-h-[30vh] text-center bg-background rounded-lg border-2 border-dashed">
                                    <Search className="h-12 w-12 text-muted-foreground" />
                                    <h3 className="mt-4 text-lg font-semibold">No Courses Found</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
                                </div>
                            )}
                    </div>
                )}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


export default function MarketplacePage() {
    return <MarketplaceContent />;
}

    