'use client'

import { useState } from 'react'
import CreatePageHeader from './CreatePageHeader'
import StepIndicator from './StepIndicator'
import CollectionForm from './CollectionForm'
import { useCreateCollectionForm } from '@/hooks/useCreateCollectionForm'

/**
 * Create Page Content Component - The main orchestrator for the create page
 * This is where users start their NFT collection journey
 * Because everyone thinks they can make an NFT collection (and we're here to help them try)
 *
 * Brings together:
 * - CreatePageHeader (title + "easier than you think" copy)
 * - StepIndicator (where you are in the flow - because we need to know)
 * - CollectionForm (name, description, chain, image - the actual form)
 *
 * @author Juan - The developer who orchestrated this create page
 * (Coded with care, humor, and probably too much coffee)
 */
export default function CreatePageContent() {
  const [step] = useState(1)
  const {
    collectionName,
    setCollectionName,
    description,
    setDescription,
    handleSubmit,
  } = useCreateCollectionForm()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <CreatePageHeader />
      <StepIndicator currentStep={step} />
      <CollectionForm
        collectionName={collectionName}
        setCollectionName={setCollectionName}
        description={description}
        setDescription={setDescription}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Create something. Anything. We believe in you. 🚀
