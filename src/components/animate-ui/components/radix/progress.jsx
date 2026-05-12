import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "../../../../lib/utils"

const Progress = React.forwardRef(({ className, value, indicatorClassName, ...props }, ref) => {
  const [currentValue, setCurrentValue] = React.useState(0)

  React.useEffect(() => {
    // Small delay ensures the initial render has 0% width before CSS transition kicks in
    const timer = setTimeout(() => setCurrentValue(value || 0), 50)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("animated-progress-track", className)}
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        background: 'var(--bg-hover)', // Fallback background
        ...props.style
      }}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn("animated-progress-indicator", indicatorClassName)}
        style={{ 
          height: '100%',
          width: '100%',
          transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: `translateX(-${100 - currentValue}%)`,
          animation: 'none' // Override old generic scale animation
        }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
