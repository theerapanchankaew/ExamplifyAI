
'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion, runTransaction, writeBatch, collection, getDocs, query, where, documentId } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import type { Course } from '@/types/course';
import type { Module } from '@/types/module';
import type { Lesson } from '@/types/lesson';


export type CartItem = {
    id: string;
    type: 'course' | 'module';
    title: string;
    imageUrl: string;
    imageHint: string;
    priceInCab: number;
    parentTitle?: string; // e.g., Course title for a module
};

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string, itemType: 'course' | 'module') => void;
  checkout: () => Promise<void>;
  isCheckingOut: boolean;
  cartCount: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const addToCart = (item: CartItem) => {
    if (cartItems.find(cartItem => cartItem.id === item.id && cartItem.type === item.type)) {
      toast({
          variant: "default",
          title: "Already in Cart",
          description: `"${item.title}" is already in your cart.`,
      });
    } else {
      setCartItems(prevItems => [...prevItems, item]);
      toast({
        title: "Added to Cart",
        description: `"${item.title}" has been added to your cart.`,
      });
    }
  };

  const removeFromCart = (itemId: string, itemType: 'course' | 'module') => {
    const itemToRemove = cartItems.find(item => item.id === itemId && item.type === itemType);
    if (itemToRemove) {
        toast({
            variant: 'destructive',
            title: 'Removed from Cart',
            description: `"${itemToRemove.title}" has been removed.`,
        })
    }
    setCartItems(prevItems => prevItems.filter(item => !(item.id === itemId && item.type === itemType)));
  };

  const total = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.priceInCab || 0), 0);
  }, [cartItems]);

  const checkout = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to checkout.' });
      return;
    }
    if (cartItems.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Your cart is empty.' });
      return;
    }

    setIsCheckingOut(true);
    const userDocRef = doc(firestore, 'users', user.uid);

    try {
      // --- Data Fetching before Transaction ---
      const moduleItems = cartItems.filter(item => item.type === 'module');
      const courseIdsFromModules = new Set<string>();

      if (moduleItems.length > 0) {
        const moduleIds = moduleItems.map(item => item.id);
        const modulesRef = collection(firestore, 'modules');
        const q_modules = query(modulesRef, where(documentId(), 'in', moduleIds));
        const moduleSnapshots = await getDocs(q_modules);
        
        const lessonIds = new Set<string>();
        moduleSnapshots.forEach(doc => {
            const moduleData = doc.data() as Module;
            lessonIds.add(moduleData.lessonId);
        });

        if (lessonIds.size > 0) {
            const lessonsRef = collection(firestore, 'lessons');
            const q_lessons = query(lessonsRef, where(documentId(), 'in', Array.from(lessonIds)));
            const lessonSnapshots = await getDocs(q_lessons);
            lessonSnapshots.forEach(doc => {
                const lessonData = doc.data() as Lesson;
                courseIdsFromModules.add(lessonData.courseId);
            });
        }
      }
      // --- End of Data Fetching ---

      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw new Error("User profile does not exist!");
        }

        const userData = userDoc.data() as UserProfile;
        const currentTokens = userData.cabTokens || 0;
        const alreadyEnrolled = userData.enrolledCourseIds || [];

        if (currentTokens < total) {
          throw new Error("Insufficient CAB tokens.");
        }
        
        // Combine all course IDs to enroll in
        const courseIdsToEnroll: Set<string> = new Set(courseIdsFromModules);
        cartItems.forEach(item => {
            if (item.type === 'course') {
                courseIdsToEnroll.add(item.id);
            }
        });

        // Filter out courses the user is already enrolled in
        const newCourseIdsToEnroll = Array.from(courseIdsToEnroll).filter(id => !alreadyEnrolled.includes(id));
        
        const newTokens = currentTokens - total;
        
        transaction.update(userDocRef, { 
            cabTokens: newTokens,
            // Only add new course IDs to prevent duplicates and unnecessary writes
            ...(newCourseIdsToEnroll.length > 0 && { enrolledCourseIds: arrayUnion(...newCourseIdsToEnroll) })
        });
      });

      toast({
        title: 'Checkout Successful!',
        description: `You have enrolled in new content. Check "My Courses".`,
      });
      setCartItems([]);
    } catch (error: any) {
      console.error("Checkout failed: ", error);
      toast({
        variant: 'destructive',
        title: 'Checkout Failed',
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };
  
  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    checkout,
    isCheckingOut,
    cartCount: cartItems.length,
    total,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
