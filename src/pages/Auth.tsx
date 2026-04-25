import { AuthModal } from '@/components/AuthModal'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AuthPage({ open, onClose, onSuccess }: Props) {
  return <AuthModal open={open} onClose={onClose} onSuccess={onSuccess} />
}
