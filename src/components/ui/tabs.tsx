import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

const tabsListVariants = cva(
  'inline-flex items-center',
  {
    variants: {
      variant: {
        default: 'h-10 justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 p-1 text-zinc-400',
        line: 'h-10 w-full justify-start gap-6 border-b border-zinc-800 text-zinc-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm',
        line: 'rounded-none border-b-2 border-transparent bg-transparent px-1 pb-2.5 pt-0.5 text-sm -mb-px data-[state=active]:border-emerald-500 data-[state=active]:text-white data-[state=inactive]:hover:text-zinc-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> &
    VariantProps<typeof tabsListVariants>
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant }), className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> &
    VariantProps<typeof tabsTriggerVariants>
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant }), className)}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, tabsTriggerVariants }
