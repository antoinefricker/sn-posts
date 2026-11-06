import { CircleAlert, CircleCheck } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export type FormMessageValue = { ok: boolean; text: string } | null

export function FormMessage({ message }: { message: FormMessageValue }) {
  if (!message) return null
  return message.ok ? (
    <Alert role="status">
      <CircleCheck />
      <AlertDescription>{message.text}</AlertDescription>
    </Alert>
  ) : (
    <Alert variant="destructive" role="alert">
      <CircleAlert />
      <AlertDescription>{message.text}</AlertDescription>
    </Alert>
  )
}
