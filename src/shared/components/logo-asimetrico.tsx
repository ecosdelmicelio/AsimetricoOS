import { cn } from '@/shared/lib/utils'

export function LogoAsimetrico({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={cn("fill-current", className)} 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="9" y="0" width="6" height="6" />
      <rect x="3" y="6" width="6" height="6" />
      <rect x="15" y="6" width="6" height="6" />
      <rect x="9" y="12" width="6" height="6" />
      <rect x="15" y="12" width="6" height="6" />
      <rect x="3" y="18" width="6" height="6" />
      <rect x="15" y="18" width="6" height="6" />
    </svg>
  )
}
