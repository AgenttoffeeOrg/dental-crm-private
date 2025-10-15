'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, Lock, AlertCircle } from 'lucide-react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe, StripeCardElementChangeEvent } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface PaymentFieldProps {
  id: string
  label: string
  required?: boolean
  amount: number // Amount in cents
  currency?: string
  description?: string
  onPaymentComplete?: (paymentIntentId: string) => void
}

function PaymentFieldInner({
  id,
  label,
  required = false,
  amount,
  currency = 'gbp',
  description,
  onPaymentComplete,
}: PaymentFieldProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [complete, setComplete] = useState(false)
  const [cardComplete, setCardComplete] = useState(false)

  const handleCardChange = (event: StripeCardElementChangeEvent) => {
    setCardComplete(event.complete)
    if (event.error) {
      setError(event.error.message)
    } else {
      setError(null)
    }
  }

  const handleSubmitPayment = async () => {
    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Create payment intent on backend
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          description,
        }),
      })

      const { clientSecret, error: intentError } = await response.json()

      if (intentError) {
        throw new Error(intentError)
      }

      // Confirm payment
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Card element not found')
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      )

      if (confirmError) {
        throw new Error(confirmError.message)
      }

      if (paymentIntent?.status === 'succeeded') {
        setComplete(true)
        if (onPaymentComplete && paymentIntent.id) {
          onPaymentComplete(paymentIntent.id)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  const formatAmount = (cents: number, curr: string) => {
    const symbol = curr.toLowerCase() === 'gbp' ? '£' : curr.toLowerCase() === 'usd' ? '$' : '€'
    return `${symbol}${(cents / 100).toFixed(2)}`
  }

  if (complete) {
    return (
      <Card className="bg-green-50 border-green-300 p-6">
        <div className="text-center">
          <div className="text-green-600 mb-3">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-green-900 mb-1">Payment Successful!</h3>
          <p className="text-sm text-green-700">
            Your payment of {formatAmount(amount, currency)} has been processed.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {description && (
        <p className="text-sm text-gray-600">{description}</p>
      )}

      {/* Amount Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-900">Amount to pay:</span>
          <span className="text-2xl font-bold text-blue-900">
            {formatAmount(amount, currency)}
          </span>
        </div>
      </div>

      {/* Stripe Card Element */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <CreditCard className="h-4 w-4" />
            <span>Card Details</span>
          </div>

          <div className="border rounded-md p-3 bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#1f2937',
                    '::placeholder': {
                      color: '#9ca3af',
                    },
                  },
                  invalid: {
                    color: '#ef4444',
                  },
                },
                hidePostalCode: false,
              }}
              onChange={handleCardChange}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Lock className="h-3 w-3" />
            <span>Secure payment powered by Stripe. Your card details are never stored.</span>
          </div>

          <Button
            type="button"
            onClick={handleSubmitPayment}
            disabled={!stripe || !cardComplete || processing}
            className="w-full"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Pay {formatAmount(amount, currency)}
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Security Badges */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Lock className="h-3 w-3" />
          256-bit SSL
        </span>
        <span>•</span>
        <span>PCI DSS Compliant</span>
        <span>•</span>
        <span>Powered by Stripe</span>
      </div>
    </div>
  )
}

export function PaymentField(props: PaymentFieldProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFieldInner {...props} />
    </Elements>
  )
}

