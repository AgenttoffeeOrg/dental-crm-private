'use client'

import { useState } from 'react'
import { Menu, X, Home, Users, Target, Settings, BarChart3 } from 'lucide-react'
import { Button } from './button'
import Link from 'next/link'

export function MobileNav() {
  const [open, setOpen] = useState(false)

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/contacts', label: 'Contacts', icon: Users },
    { href: '/pipeline', label: 'Pipeline', icon: Target },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/settings', label: 'Settings', icon: Settings }
  ]

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="fixed top-4 right-4 z-50"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {open && (
        <div className="fixed inset-0 bg-white z-40 p-8">
          <nav className="space-y-4 mt-16">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 p-4 hover:bg-gray-100 rounded-lg"
              >
                <link.icon className="h-5 w-5" />
                <span className="text-lg">{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  )
}


