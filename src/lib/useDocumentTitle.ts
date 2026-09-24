import { useEffect } from 'react'

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Ariya` : 'Ariya — Plan the owambe, skip the wahala'
  }, [title])
}
