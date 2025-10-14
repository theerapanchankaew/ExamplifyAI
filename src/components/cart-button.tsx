
'use client';

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CartButton() {
    const { cartCount } = useCart();
    return (
        <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="sr-only">Shopping Cart</span>
            {cartCount > 0 && (
                <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
                >
                    {cartCount}
                </Badge>
            )}
        </Button>
    )
}
