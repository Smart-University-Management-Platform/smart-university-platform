package com.smartuniversity.common.util;

import java.util.regex.Pattern;

/**
 * Utility class for sanitizing user input to prevent XSS attacks.
 * 
 * This provides basic HTML sanitization by:
 * 1. Escaping HTML special characters
 * 2. Optionally stripping all HTML tags
 * 
 * For production use with rich text, consider using OWASP HTML Sanitizer
 * or jsoup with a whitelist.
 */
public final class HtmlSanitizer {

    private static final Pattern SCRIPT_PATTERN = Pattern.compile(
            "<script[^>]*>.*?</script>", 
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    
    private static final Pattern EVENT_HANDLER_PATTERN = Pattern.compile(
            "\\s+on\\w+\\s*=\\s*[\"'][^\"']*[\"']",
            Pattern.CASE_INSENSITIVE);
    
    private static final Pattern JAVASCRIPT_PROTOCOL_PATTERN = Pattern.compile(
            "javascript\\s*:",
            Pattern.CASE_INSENSITIVE);
    
    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<[^>]+>");

    private HtmlSanitizer() {
        // Utility class - no instantiation
    }

    /**
     * Escapes HTML special characters to prevent XSS.
     * Use this when you want to display user input as plain text.
     *
     * @param input the potentially unsafe input string
     * @return the escaped string safe for HTML display, or null if input is null
     */
    public static String escapeHtml(String input) {
        if (input == null) {
            return null;
        }
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }

    /**
     * Removes all HTML tags and dangerous patterns from input.
     * Use this when you want to store plain text and strip any HTML.
     *
     * @param input the potentially unsafe input string
     * @return the sanitized string with HTML removed, or null if input is null
     */
    public static String stripHtml(String input) {
        if (input == null) {
            return null;
        }
        
        String result = input;
        
        // Remove script tags and their contents
        result = SCRIPT_PATTERN.matcher(result).replaceAll("");
        
        // Remove javascript: protocol
        result = JAVASCRIPT_PROTOCOL_PATTERN.matcher(result).replaceAll("");
        
        // Remove event handlers (onclick, onload, etc.)
        result = EVENT_HANDLER_PATTERN.matcher(result).replaceAll("");
        
        // Remove all remaining HTML tags
        result = HTML_TAG_PATTERN.matcher(result).replaceAll("");
        
        // Trim whitespace that may have been left
        return result.trim();
    }

    /**
     * Sanitizes input by removing dangerous elements but preserving safe HTML.
     * This is a basic sanitizer - for complex requirements, use OWASP HTML Sanitizer.
     *
     * @param input the potentially unsafe input string
     * @return the sanitized string, or null if input is null
     */
    public static String sanitize(String input) {
        if (input == null) {
            return null;
        }
        
        String result = input;
        
        // Remove script tags and their contents
        result = SCRIPT_PATTERN.matcher(result).replaceAll("");
        
        // Remove javascript: protocol
        result = JAVASCRIPT_PROTOCOL_PATTERN.matcher(result).replaceAll("");
        
        // Remove event handlers
        result = EVENT_HANDLER_PATTERN.matcher(result).replaceAll("");
        
        return result;
    }
}
