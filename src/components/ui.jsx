// shadcn/ui-style source components, adapted from its Radix/New York patterns.
import React from 'react';
import {Slot} from '@radix-ui/react-slot';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {cva} from 'class-variance-authority';
import {clsx} from 'clsx';
import {twMerge} from 'tailwind-merge';
import {X} from 'lucide-react';
export const cn=(...v)=>twMerge(clsx(v));
const variants=cva('button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',{variants:{variant:{default:'button-primary',secondary:'button-secondary',ghost:'button-ghost',outline:'button-outline'},size:{default:'h-12 px-5',sm:'h-10 px-4 text-sm',icon:'h-12 w-12 p-0',lg:'h-14 px-6'}},defaultVariants:{variant:'default',size:'default'}});
export const Button=React.forwardRef(({className,variant,size,asChild=false,...props},ref)=>{const Comp=asChild?Slot:'button';return <Comp ref={ref} className={cn(variants({variant,size,className}))} {...props}/>});
export const Input=React.forwardRef(({className,...props},ref)=><input ref={ref} className={cn('input',className)} {...props}/>);
export function Badge({className,children}){return <span className={cn('badge',className)}>{children}</span>}
export const Dialog=DialogPrimitive.Root;
export function DialogContent({children,className}){return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="dialog-overlay"/><DialogPrimitive.Content className={cn('dialog-content',className)}>{children}<DialogPrimitive.Close className="dialog-close" aria-label="Schließen"><X size={20}/></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>}
export const DialogTitle=DialogPrimitive.Title;
export const DialogDescription=DialogPrimitive.Description;
