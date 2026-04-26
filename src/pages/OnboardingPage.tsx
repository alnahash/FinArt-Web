import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getProfile, getCategories, completeOnboarding } from '../services/db'
import type { Profile, Category } from '../types'
import WizardLayout from '../components/onboarding/WizardLayout'
import Step1Welcome from '../components/onboarding/Step1Welcome'
import Step2MonthlyBudget from '../components/onboarding/Step2MonthlyBudget'
import Step3Categories from '../components/onboarding/Step3Categories'
import Step4BudgetAllocation from '../components/onboarding/Step4BudgetAllocation'
import Step5Goals from '../components/onboarding/Step5Goals'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')

  // Load profile and categories on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        navigate('/login')
        return
      }
      try {
        const { data: profileData, error: profileError } = await getProfile(user.id)
        if (profileError) throw profileError
        setProfile(profileData)

        const { data: catsData, error: catsError } = await getCategories(user.id)
        if (catsError) throw catsError
        setCategories(catsData || [])

        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
        setLoading(false)
      }
    }
    loadData()
  }, [user, navigate])

  const handleNext = () => {
    setError('')
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = async () => {
    // Skip wizard and go to dashboard, but don't mark as onboarded
    navigate('/dashboard')
  }

  const handleComplete = async () => {
    if (!user) return
    try {
      setLoading(true)
      await completeOnboarding(user.id)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding')
      setLoading(false)
    }
  }

  const handleProfileUpdate = (updates: Partial<Profile>) => {
    if (profile) {
      setProfile({ ...profile, ...updates })
    }
  }

  const handleCategoryUpdate = (updatedCategory: Category) => {
    setCategories(categories.map(c => c.id === updatedCategory.id ? updatedCategory : c))
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  const steps = [
    { title: 'Welcome', description: 'Let\'s set up your profile' },
    { title: 'Budget', description: 'Set your monthly budget' },
    { title: 'Categories', description: 'Customize your categories' },
    { title: 'Allocate', description: 'Set category budgets' },
    { title: 'Goals', description: 'Set spending goals' },
  ]

  return (
    <WizardLayout
      currentStep={currentStep}
      totalSteps={5}
      stepTitle={steps[currentStep - 1].title}
      stepDescription={steps[currentStep - 1].description}
      onBack={handleBack}
      onNext={handleNext}
      onSkip={handleSkip}
      onComplete={handleComplete}
      isLoading={loading}
      error={error}
      showBackButton={currentStep > 1}
      showCompleteButton={currentStep === 5}
    >
      {currentStep === 1 && (
        <Step1Welcome
          profile={profile}
          onUpdate={handleProfileUpdate}
          onNext={handleNext}
        />
      )}
      {currentStep === 2 && (
        <Step2MonthlyBudget
          profile={profile}
          onUpdate={handleProfileUpdate}
          onNext={handleNext}
        />
      )}
      {currentStep === 3 && (
        <Step3Categories
          categories={categories}
          userId={user?.id || ''}
          onCategoryUpdate={handleCategoryUpdate}
          onNext={handleNext}
        />
      )}
      {currentStep === 4 && (
        <Step4BudgetAllocation
          categories={categories}
          userId={user?.id || ''}
          onNext={handleNext}
        />
      )}
      {currentStep === 5 && (
        <Step5Goals
          categories={categories}
          userId={user?.id || ''}
        />
      )}
    </WizardLayout>
  )
}
