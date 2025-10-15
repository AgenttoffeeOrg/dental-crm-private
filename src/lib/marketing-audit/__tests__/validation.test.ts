/**
 * Validation Utilities - Unit Tests
 */

import {
  isValidDomain,
  isValidEmail,
  isValidUUID,
  isValidScore,
  isValidCategory,
  sanitizeString,
  sanitizeURL,
  clampNumber,
  validatePagination,
  isValidAPIKey,
} from '../utils/validation';

describe('Validation Utils', () => {
  describe('isValidDomain', () => {
    it('should validate correct domains', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('subdomain.example.com')).toBe(true);
      expect(isValidDomain('my-site.co.uk')).toBe(true);
    });
    
    it('should accept domains with protocols', () => {
      expect(isValidDomain('https://example.com')).toBe(true);
      expect(isValidDomain('http://example.com/')).toBe(true);
    });
    
    it('should reject invalid domains', () => {
      expect(isValidDomain('not a domain')).toBe(false);
      expect(isValidDomain('example')).toBe(false);
      expect(isValidDomain('')).toBe(false);
      expect(isValidDomain('example..com')).toBe(false);
    });
  });
  
  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user+tag@domain.co.uk')).toBe(true);
    });
    
    it('should reject invalid emails', () => {
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });
  
  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
    });
    
    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(false); // Invalid version
      expect(isValidUUID('')).toBe(false);
    });
  });
  
  describe('isValidScore', () => {
    it('should validate scores between 0-100', () => {
      expect(isValidScore(0)).toBe(true);
      expect(isValidScore(50)).toBe(true);
      expect(isValidScore(100)).toBe(true);
      expect(isValidScore(75.5)).toBe(true);
    });
    
    it('should reject invalid scores', () => {
      expect(isValidScore(-1)).toBe(false);
      expect(isValidScore(101)).toBe(false);
      expect(isValidScore(NaN)).toBe(false);
    });
  });
  
  describe('isValidCategory', () => {
    it('should validate known categories', () => {
      expect(isValidCategory('technical_seo')).toBe(true);
      expect(isValidCategory('local_presence')).toBe(true);
      expect(isValidCategory('content_authority')).toBe(true);
    });
    
    it('should reject unknown categories', () => {
      expect(isValidCategory('unknown')).toBe(false);
      expect(isValidCategory('')).toBe(false);
    });
  });
  
  describe('sanitizeString', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeString('onclick=alert(1)')).toBe('alert(1)');
      expect(sanitizeString('javascript:void(0)')).toBe('void(0)');
    });
    
    it('should trim and limit length', () => {
      const longString = 'a'.repeat(2000);
      expect(sanitizeString(longString).length).toBe(1000);
      expect(sanitizeString('  test  ')).toBe('test');
    });
  });
  
  describe('sanitizeURL', () => {
    it('should sanitize valid URLs', () => {
      expect(sanitizeURL('https://example.com')).toBe('https://example.com/');
      expect(sanitizeURL('example.com')).toBe('https://example.com/');
    });
    
    it('should reject dangerous protocols', () => {
      expect(sanitizeURL('javascript:alert(1)')).toBe('');
      expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe('');
    });
  });
  
  describe('clampNumber', () => {
    it('should clamp values within range', () => {
      expect(clampNumber(5, 0, 10)).toBe(5);
      expect(clampNumber(-5, 0, 10)).toBe(0);
      expect(clampNumber(15, 0, 10)).toBe(10);
    });
    
    it('should handle invalid values', () => {
      expect(clampNumber(NaN, 0, 10)).toBe(0);
    });
  });
  
  describe('validatePagination', () => {
    it('should return valid pagination params', () => {
      expect(validatePagination(10, 0)).toEqual({ limit: 10, offset: 0 });
      expect(validatePagination()).toEqual({ limit: 10, offset: 0 });
    });
    
    it('should clamp invalid values', () => {
      expect(validatePagination(200, -10)).toEqual({ limit: 100, offset: 0 });
      expect(validatePagination(0, 0)).toEqual({ limit: 1, offset: 0 });
    });
  });
  
  describe('isValidAPIKey', () => {
    it('should validate correct API keys', () => {
      expect(isValidAPIKey('abcdefghijklmnopqrstuvwxyz1234567890')).toBe(true);
      expect(isValidAPIKey('test-key-with-dashes_and_underscores.dots')).toBe(true);
    });
    
    it('should reject invalid API keys', () => {
      expect(isValidAPIKey('short')).toBe(false);
      expect(isValidAPIKey('has spaces in it')).toBe(false);
      expect(isValidAPIKey('')).toBe(false);
    });
  });
});

