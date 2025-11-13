'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { MarketingForm, FormField } from '@/hooks/use-marketing-forms';
import { buildInitialFormData, extractUtmParams } from '@/lib/forms/url-prefill';
import {
  getContactByEmail,
  filterFieldsForProgressiveProfiling,
} from '@/lib/forms/progressive-profiling';
import { useAuth } from '@/lib/auth';

interface FormRendererProps {
  form: MarketingForm;
  onSubmit?: (data: any) => void;
  standalone?: boolean; // For embedded forms
}

export function FormRenderer({ form, onSubmit, standalone = false }: FormRendererProps) {
  const { appUser } = useAuth();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [visibleFields, setVisibleFields] = useState<FormField[]>(form.fields_json);
  const [progressiveProfilingEnabled] = useState(true); // Can be made configurable

  // Honeypot field (hidden from users, but bots will fill it)
  const [honeypot, setHoneypot] = useState('');

  // Track form load time (for spam detection)
  const [formLoadTime] = useState(Date.now().toString());

  useEffect(() => {
    // Initialize form data with URL prefilling and progressive profiling
    const initializeForm = async () => {
      // Get email from URL params for progressive profiling
      const urlParams = new URLSearchParams(window.location.search);
      const emailParam = urlParams.get('email') || urlParams.get('e');

      let knownContactData = null;
      if (emailParam && appUser?.tenant_id && progressiveProfilingEnabled) {
        try {
          knownContactData = await getContactByEmail(emailParam, appUser.tenant_id);
        } catch (error) {
          console.error('[FormRenderer] Error loading contact data:', error);
        }
      }

      // Filter fields for progressive profiling
      const fieldsToShow = filterFieldsForProgressiveProfiling(
        form.fields_json,
        knownContactData,
        progressiveProfilingEnabled
      );
      setVisibleFields(fieldsToShow);

      // Initialize form data with URL prefilling
      const initialData = buildInitialFormData(
        form.fields_json.map((field) => ({
          id: field.id,
          type: field.type,
          label: field.label,
          fieldName: (field as any).field_name || field.id,
          allowPrefill: (field as any).allowPrefill !== false,
          urlParamName: (field as any).urlParamName,
          defaultValue: (field as any).defaultValue,
          hidden: (field as any).hidden === true,
        })),
        true // Include UTM parameters
      );

      // Prefill with known contact data
      if (knownContactData) {
        Object.entries(knownContactData).forEach(([key, value]) => {
          if (value) {
            // Find matching field
            const matchingField = form.fields_json.find(
              (f) => (f as any).field_name === key || f.id === key
            );
            if (matchingField) {
              initialData[matchingField.id] = value;
            }
          }
        });
      }

      setFormData(initialData);
    };

    initializeForm();
  }, [form, appUser?.tenant_id, progressiveProfilingEnabled]);

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} is required`;
    }

    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    if (field.type === 'phone' && value) {
      const phoneRegex = /^[\d\s+()-]{10,}$/;
      if (!phoneRegex.test(value)) {
        return 'Please enter a valid phone number';
      }
    }

    if (field.validation) {
      if (field.validation.minLength && value && value.length < field.validation.minLength) {
        return `Must be at least ${field.validation.minLength} characters`;
      }
      if (field.validation.maxLength && value && value.length > field.validation.maxLength) {
        return `Must be no more than ${field.validation.maxLength} characters`;
      }
      if (field.validation.min !== undefined && value && parseInt(value) < field.validation.min) {
        return `Must be at least ${field.validation.min}`;
      }
      if (field.validation.max !== undefined && value && parseInt(value) > field.validation.max) {
        return `Must be no more than ${field.validation.max}`;
      }
      if (field.validation.pattern && value) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          return 'Invalid format';
        }
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    form.fields_json.forEach((field: FormField) => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the errors in the form');
      return;
    }

    setSubmitting(true);

    try {
      // Submit to API
      const response = await fetch('/api/marketing/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.id,
          formName: form.name,
          payload: formData,
          sourceUrl: window.location.href,
          honeypot, // Include honeypot value
          formLoadTime, // Include load time for spam detection
          utmParams: extractUtmParams(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Submission failed');
      }

      if (result.isSpam) {
        // Silently handle spam (don't show error to bot)
        setSubmitted(true);
        return;
      }

      setSubmitted(true);

      if (onSubmit) {
        onSubmit(result);
      }

      // Redirect if configured
      if (form.redirect_url) {
        setTimeout(() => {
          window.location.href = form.redirect_url as string;
        }, 2000);
      }
    } catch (error) {
      console.error('[FormRenderer] Submission error:', error);
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));

    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id] || '';
    const error = errors[field.id];
    const isHidden = (field as any).hidden === true;

    // Render hidden fields as hidden inputs
    if (isHidden) {
      return <input key={field.id} type="hidden" name={field.id} value={value} readOnly />;
    }

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.type}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={error ? 'border-red-500' : ''}
              rows={4}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)}>
              <SelectTrigger className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'radio':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label key={option} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name={field.id}
                    value={option}
                    checked={value === option}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="space-y-2">
            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value === true || value === 'true'}
                onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600"
              />
              <span className="text-sm">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'scale':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                type="range"
                min={field.validation?.min || 0}
                max={field.validation?.max || 10}
                value={value}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className="flex-1"
              />
              <span className="font-semibold text-lg w-12 text-center">{value}</span>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
        <p className="text-gray-600 whitespace-pre-line">
          {form.success_message.replace(/\{\{(\w+)\}\}/g, (match, key) => formData[key] || match)}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot field (hidden from humans) */}
      <div
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
        aria-hidden="true"
      >
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {visibleFields.map((field) => renderField(field))}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Submitting...' : form.button_text || 'Submit'}
      </Button>
    </form>
  );
}
