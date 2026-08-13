/**
 * Tests for object description validation.
 * Covers boundary testing and edge cases per LLD §7.
 */

import { describe, it, expect } from 'vitest';
import { validateObjectDescription, MAX_DESCRIPTION_LENGTH } from '../objectDescriptionValidation';

describe('validateObjectDescription', () => {
  it('should accept a valid description', () => {
    const result = validateObjectDescription('wooden chair');
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject empty string', () => {
    const result = validateObjectDescription('');
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain('empty');
  });

  it('should reject whitespace-only string', () => {
    const result = validateObjectDescription('   ');
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain('empty');
  });

  it('should accept exactly 200 characters (max)', () => {
    const description = 'a'.repeat(200);
    const result = validateObjectDescription(description);
    expect(result.ok).toBe(true);
  });

  it('should accept 199 characters', () => {
    const description = 'a'.repeat(199);
    const result = validateObjectDescription(description);
    expect(result.ok).toBe(true);
  });

  it('should reject 201 characters (over max)', () => {
    const description = 'a'.repeat(201);
    const result = validateObjectDescription(description);
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain('exceed');
  });

  it('should accept description with mixed characters', () => {
    const result = validateObjectDescription('Red wooden chair, modern style - 2024!');
    expect(result.ok).toBe(true);
  });

  it('should reject description with null bytes', () => {
    const result = validateObjectDescription('test\x00null');
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain('invalid characters');
  });

  it('should reject description with control characters', () => {
    const result = validateObjectDescription('test\x01\x02');
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain('invalid characters');
  });

  it('should include field name in error', () => {
    const result = validateObjectDescription('');
    expect(result.error?.field).toBe('description');
  });
});
