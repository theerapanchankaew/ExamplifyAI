
'use client';

import Image from 'next/image';
import { ShoppingCart, Trash2, Gem, Loader2 } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';

export function CartButton() {
    const { cartItems, cartCount, total, removeFromCart, checkout, isCheckingOut } = useCart();

    return (
        <Sheet>
            <SheetTrigger asChild>
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
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>My Cart ({cartCount})</SheetTitle>
                </SheetHeader>
                <Separator className="my-4" />
                {cartCount > 0 ? (
                    <>
                        <ScrollArea className="h-[calc(100vh-200px)]">
                            <div className="flex flex-col gap-6 pr-4">
                                {cartItems.map(item => (
                                    <div key={item.id} className="flex gap-4">
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.description}
                                            width={120}
                                            height={80}
                                            className="rounded-md object-cover aspect-video"
                                        />
                                        <div className="flex flex-col justify-between flex-1">
                                            <div>
                                                <h4 className="font-semibold text-sm leading-tight">{item.description}</h4>
                                                <div className="flex items-center gap-1 text-primary font-bold text-sm mt-1">
                                                    <Gem className="h-3 w-3" />
                                                    <span>{item.priceInCab}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="self-center" onClick={() => removeFromCart(item.id)}>
                                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <SheetFooter className='mt-4'>
                            <div className="w-full flex flex-col gap-4">
                                <Separator />
                                <div className="flex justify-between items-center font-bold text-lg">
                                    <span>Total</span>
                                    <div className="flex items-center gap-2 text-primary">
                                        <Gem className="h-5 w-5" />
                                        <span>{total}</span>
                                    </div>
                                </div>
                                <Button className="w-full" size="lg" onClick={checkout} disabled={isCheckingOut}>
                                    {isCheckingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Checkout
                                </Button>
                            </div>
                        </SheetFooter>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <ShoppingCart className="h-16 w-16 mb-4" />
                        <h3 className="text-lg font-semibold">Your cart is empty</h3>
                        <p className="text-sm">Add some courses to get started!</p>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
