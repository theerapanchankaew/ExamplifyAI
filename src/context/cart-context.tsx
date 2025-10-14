
'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';

interface CartItem extends ImagePlaceholder {}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: ImagePlaceholder) => void;
  removeFromCart: (itemId: string) => void;
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
  const { toast } = useToast();

  const addToCart = (item: ImagePlaceholder) => {
    setCartItems(prevItems => {
      // Check if item is already in cart
      if (prevItems.find(cartItem => cartItem.id === item.id)) {
        toast({
            variant: "default",
            title: "Already in Cart",
            description: `"${item.description}" is already in your cart.`,
        });
        return prevItems;
      }
      toast({
        title: "Added to Cart",
        description: `"${item.description}" has been added to your cart.`,
      });
      return [...prevItems, { ...item }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prevItems => {
        const itemToRemove = prevItems.find(item => item.id === itemId);
        if (itemToRemove) {
            toast({
                variant: 'destructive',
                title: 'Removed from Cart',
                description: `"${itemToRemove.description}" has been removed.`,
            })
        }
        return prevItems.filter(item => item.id !== itemId)
    });
  };

  const total = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.priceInCab || 0), 0);
  }, [cartItems]);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    cartCount: cartItems.length,
    total,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
