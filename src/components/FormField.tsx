import type { ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FormFieldProps = ComponentProps<typeof Input> & { label: string; name: string }

/** A label + input pair, wired together by id. */
export function FormField({ label, name, ...inputProps }: FormFieldProps) {
  const id = `field-${name}`
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} {...inputProps} />
    </div>
  )
}
