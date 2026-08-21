import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-border/80 shadow-[2px_3px_0px_rgba(0,0,0,0.35)] dark:shadow-[2px_3px_0px_rgba(255,255,255,0.2)] active:translate-y-[2px] active:translate-x-[1px] active:scale-[0.96] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4)] aria-pressed:translate-y-[2px] aria-pressed:translate-x-[1px] aria-pressed:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4)] aria-pressed:bg-accent/80 data-[state=open]:translate-y-[2px] data-[state=open]:translate-x-[1px] data-[state=open]:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4)] data-[state=open]:bg-accent/80 data-[pressed=true]:translate-y-[2px] data-[pressed=true]:translate-x-[1px] data-[pressed=true]:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4)] data-[pressed=true]:bg-accent/80 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
