'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ImageIcon } from 'lucide-react'
import { CreateCollectionFormData } from '@/hooks/useCreateCollectionForm'

interface CollectionFormProps {
  collectionName: string
  setCollectionName: (value: string) => void
  description: string
  setDescription: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
}

/**
 * Collection Form Component - The form for creating a new NFT collection
 * Solana-only launchpad (all collections are created on Solana)
 *
 * Fields: name, description, chain (read-only Solana), image upload
 * Because everyone thinks they can make an NFT collection
 * (And we're here to help them try, even if they fail)
 *
 * @author Juan - The developer who built this form
 * (Coded with care, humor, and probably too much coffee)
 */
export default function CollectionForm({
  collectionName,
  setCollectionName,
  description,
  setDescription,
  onSubmit,
}: CollectionFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Collection Details</CardTitle>
          <CardDescription>
            Basic information about your collection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Collection name - Because everything needs a name */}
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Collection Name *
            </label>
            <input
              type="text"
              required
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="My Awesome Collection"
              className="w-full px-4 py-3 bg-dark-bg-primary border border-dark-border-primary rounded-lg text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-border-accent"
            />
          </div>

          {/* Description - Because context is everything */}
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Description *
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your collection..."
              rows={4}
              className="w-full px-4 py-3 bg-dark-bg-primary border border-dark-border-primary rounded-lg text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-border-accent resize-none"
            />
          </div>

          {/* Chain – Solana-only (read-only, because we're a Solana launchpad)
              Because you can't change the chain mid-form (that would be chaos) */}
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Chain
            </label>
            <div className="w-full px-4 py-3 bg-dark-bg-tertiary border border-dark-border-primary rounded-lg text-dark-text-secondary">
              Solana
            </div>
          </div>

          {/* Upload section - Because images are important */}
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Collection Image *
            </label>
            <div className="border-2 border-dashed border-dark-border-primary rounded-lg p-12 text-center hover:border-dark-border-accent transition-colors cursor-pointer">
              <ImageIcon className="w-12 h-12 text-dark-text-tertiary mx-auto mb-4" />
              <p className="text-dark-text-secondary mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-dark-text-tertiary">
                PNG, JPG, GIF up to 10MB
              </p>
            </div>
          </div>

          {/* Action buttons - Cancel (go back) + Create Collection (submit)
              Because we need to do something (and "just stare" isn't an option) */}
          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Collection
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Forms: where dreams become (hopefully valid) data. 📝
