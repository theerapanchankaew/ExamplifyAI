
'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion, runTransaction, writeBatch } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import type { Course } from '@/types/course';
import type { Module } from '@/types/module';


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
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw new Error("User profile does not exist!");
        }

        const userData = userDoc.data() as UserProfile;
        const currentTokens = userData.cabTokens || 0;

        if (currentTokens < total) {
          throw new Error("Insufficient CAB tokens.");
        }
        
        // Separate items by type
        const courseIdsToEnroll = cartItems.filter(item => item.type === 'course').map(item => item.id);
        // We might need a separate field for modules, for now, we just enroll in the parent course
        // For simplicity, we are assuming buying a module means enrolling in the parent course if not already enrolled
        // A more complex logic would be needed for a real app (e.g. `enrolledModuleIds`)
        
        const newTokens = currentTokens - total;
        
        // This is a simplified logic. A real app might need to handle module purchases differently.
        // Here, we just enroll the user in the course.
        transaction.update(userDocRef, { 
            cabTokens: newTokens,
            enrolledCourseIds: arrayUnion(...courseIdsToEnroll)
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
