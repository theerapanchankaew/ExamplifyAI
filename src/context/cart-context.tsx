
'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion, runTransaction } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import type { Course } from '@/types/course';

export interface CartItem extends Course {
    imageUrl: string;
    imageHint: string;
    priceInCab: number;
}


interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
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
    setCartItems(prevItems => {
      if (prevItems.find(cartItem => cartItem.id === item.id)) {
        toast({
            variant: "default",
            title: "Already in Cart",
            description: `"${item.title}" is already in your cart.`,
        });
        return prevItems;
      }
      toast({
        title: "Added to Cart",
        description: `"${item.title}" has been added to your cart.`,
      });
      return [...prevItems, item];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prevItems => {
        const itemToRemove = prevItems.find(item => item.id === itemId);
        if (itemToRemove) {
            toast({
                variant: 'destructive',
                title: 'Removed from Cart',
                description: `"${itemToRemove.title}" has been removed.`,
            })
        }
        return prevItems.filter(item => item.id !== itemId)
    });
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
        
        const courseIdsToEnroll = cartItems.map(item => item.id);


        const newTokens = currentTokens - total;
        
        transaction.update(userDocRef, { 
            cabTokens: newTokens,
            enrolledCourseIds: arrayUnion(...courseIdsToEnroll)
        });
      });

      toast({
        title: 'Checkout Successful!',
        description: `You have enrolled in ${cartItems.length} new course(s).`,
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
