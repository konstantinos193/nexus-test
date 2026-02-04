import { useState } from 'react'

export interface CreateCollectionFormData {
  collectionName: string
  description: string
  blockchain: 'solana'
}

/**
 * Custom hook for managing create collection form state.
 * Solana-only launchpad – all collections are on Solana.
 */
export function useCreateCollectionForm() {
  const [collectionName, setCollectionName] = useState('')
  const [description, setDescription] = useState('')

  const formData: CreateCollectionFormData = {
    collectionName,
    description,
    blockchain: 'solana',
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Actually save the collection (when we have a backend)
    console.log('Creating collection:', formData)
    alert('Collection creation coming soon! (Backend is still in development)')
  }

  return {
    collectionName,
    setCollectionName,
    description,
    setDescription,
    formData,
    handleSubmit,
  }
}
