'use client'

/**
 * PhantomProvider Component - Wraps the app with Phantom Connect SDK
 * This provides wallet connectivity throughout the application
 */

import { PhantomProvider as PhantomProviderSDK, AddressType } from '@phantom/react-sdk'

interface PhantomProviderProps {
  children: React.ReactNode
}

export default function PhantomProvider({ children }: PhantomProviderProps) {
  const appId = process.env.NEXT_PUBLIC_PHANTOM_APP_ID

  if (!appId || appId === 'your_phantom_app_id_here') {
    console.warn(
      'Phantom App ID not configured. Please set NEXT_PUBLIC_PHANTOM_APP_ID in your .env.local file. ' +
      'Get your App ID from https://phantom.com/portal/'
    )
  }

  return (
    <PhantomProviderSDK
      config={{
        appId: appId || '',
        providers: ['google', 'apple', 'phantom', 'injected'],
        addressTypes: [AddressType.solana],
      }}
    >
      {children}
    </PhantomProviderSDK>
  )
}
