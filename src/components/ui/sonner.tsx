"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Light mode first; pass theme="system" here once dark tokens are added.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-status-success-fg" />,
        info: <InfoIcon className="size-4 text-status-active-fg" />,
        warning: <TriangleAlertIcon className="size-4 text-status-waiting-fg" />,
        error: <OctagonXIcon className="size-4 text-status-danger-fg" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "cn-toast font-sans" } }}
      {...props}
    />
  )
}

export { Toaster }
