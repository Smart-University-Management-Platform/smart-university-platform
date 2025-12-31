// Environment configuration
// This file provides environment variables from Vite's import.meta.env
// Tests mock this file to provide test values

// @ts-ignore - import.meta.env is Vite-specific
export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8080';
