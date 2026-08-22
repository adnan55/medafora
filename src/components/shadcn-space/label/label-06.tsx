'use client'

import * as React from 'react'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { UserRound, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FloatingLabelProps extends Omit<ComponentProps<'input'>, 'value' | 'onChange'> {
  label?: string
  icon?: LucideIcon | ReactNode
  value?: string
  defaultValue?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  containerClassName?: string
}

export const FloatingLabel = ({
  label = 'Full name',
  icon: Icon = UserRound,
  value: controlledValue,
  defaultValue = '',
  onChange,
  containerClassName,
  className,
  id: customId,
  name,
  type = 'text',
  required,
  ...props
}: FloatingLabelProps) => {
  const generatedId = useId()
  const id = customId || generatedId
  const [focused, setFocused] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue)
  
  const value = controlledValue !== undefined ? controlledValue : internalValue
  const isFloated = focused || String(value).length > 0

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (controlledValue === undefined) {
      setInternalValue(e.target.value)
    }
    onChange?.(e)
  }

  const renderIcon = () => {
    if (!Icon) return null
    if (React.isValidElement(Icon)) {
      return (
        <div
          className={cn(
            'size-4 shrink-0 transition-colors duration-300 mb-1 flex items-center justify-center [&_svg]:size-4',
            focused ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {Icon}
        </div>
      )
    }
    if (typeof Icon === 'function' || typeof Icon === 'object') {
      const Component = Icon as LucideIcon
      return (
        <Component
          className={cn(
            'size-4 shrink-0 transition-colors duration-300 mb-1',
            focused ? 'text-primary' : 'text-muted-foreground',
          )}
        />
      )
    }
    return null
  }

  return (
    <div className={cn('w-full max-w-xs', containerClassName)}>
      <div className='flex items-end gap-3 pb-1'>
        {renderIcon()}
        <div className='relative flex-1'>
          <Input
            id={id}
            name={name}
            type={type}
            required={required}
            value={value}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
              'h-auto rounded-none border-none px-0 pb-0.5 pt-5 text-sm shadow-none dark:bg-transparent focus-visible:ring-0 focus-visible:border-transparent',
              className,
            )}
            {...props}
          />
          <Label
            htmlFor={id}
            className={cn(
              'pointer-events-none absolute left-0 cursor-text transition-all duration-300 ease-in-out select-none',
              isFloated
                ? 'top-0.5 text-xs text-primary font-medium'
                : 'top-5 text-sm text-muted-foreground font-normal',
            )}
          >
            {label}
          </Label>
        </div>
      </div>

      {/* Animated bottom line */}
      <div className='relative h-px'>
        <div className='absolute inset-0 bg-border' />
        <motion.div
          className='absolute inset-0 bg-primary'
          initial={false}
          animate={{ scaleX: focused ? 1 : 0, opacity: focused ? 1 : 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformOrigin: 'center' }}
        />
      </div>
    </div>
  )
}

export default FloatingLabel
