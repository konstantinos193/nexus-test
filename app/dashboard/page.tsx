/**
 * Dashboard Page - Creator shell (Milestone 1)
 * Layout, header, connect state or stats + empty collections
 * No API, no CollectionGrid, no draft. Just the frame.
 * Because you have to build the frame before you hang the art
 * (And we're not hanging art until the next milestone)
 *
 * @author Juan - The developer who built the dashboard frame
 * (Coded with care, humor, and probably too much coffee)
 */

'use client'

// Wallet state - we need to know if they're connected before showing stats
// Because showing "0 collections" to someone who hasn't connected is just rude
import { useWallet } from '@solana/wallet-adapter-react'
// Layout - header, footer, the usual scaffolding
// Without it we're just a div floating in space
import Layout from '@/components/layout/Layout'
// Dashboard pieces - header, connect state, stats grid, empty collections
// Each does one thing. Because single responsibility is a thing (unlike my inbox)
import DashboardHeader from './DashboardHeader'
import DashboardConnectState from './DashboardConnectState'
import DashboardStatsGrid from './DashboardStatsGrid'
import DashboardEmptyCollections from './DashboardEmptyCollections'

export default function DashboardPage() {
  // Connected = have they connected a wallet?
  // We branch on this: not connected = show "connect wallet" card; connected = show stats + empty list
  const { connected } = useWallet()

  // Not connected - show the connect-wallet empty state
  // Because we're not going to show them a dashboard of zeros and pretend that's helpful
  if (!connected) {
    return (
      <Layout>
        <div className="nft-dashboard-page">
          <div className="nft-dashboard-container">
            <DashboardHeader subtitle="Connect your wallet to manage your collections" />
            <DashboardConnectState />
          </div>
        </div>
      </Layout>
    )
  }

  // Connected - show header, stat cards (0s for M1), and empty collections section
  // Because the shell has to look like a dashboard even when there's no data yet
  return (
    <Layout>
      <div className="nft-dashboard-page">
        <div className="nft-dashboard-container">
          <DashboardHeader subtitle="Manage your collections and track your NFT journey" />
          <DashboardStatsGrid />
          <DashboardEmptyCollections />
        </div>
      </div>
    </Layout>
  )
}

// Coded by Juan - because every good codebase needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Shell today. Stats tomorrow. We're building.
