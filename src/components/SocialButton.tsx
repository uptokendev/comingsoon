import type { ReactNode } from 'react'

type Props = {
  href: string
  label: string
  icon: ReactNode
}

export default function SocialButton({ href, label, icon }: Props) {
  const safeHref = href?.trim()
  const disabled = !safeHref || safeHref === 'https://x.com/' || safeHref === 'https://t.me/'

  return (
    <a
      className={`btn ${disabled ? 'btn--disabled' : ''}`}
      href={disabled ? undefined : safeHref}
      target={disabled ? undefined : '_blank'}
      rel={disabled ? undefined : 'noreferrer'}
      aria-disabled={disabled}
      onClick={(e) => {
        if (disabled) e.preventDefault()
      }}
    >
      <span className="btn__icon" aria-hidden>
        {icon}
      </span>
      <span className="btn__label">{label}</span>
    </a>
  )
}
