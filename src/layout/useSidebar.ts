import { useContext } from 'react'
import { SidebarContext } from './SidebarContext'

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
