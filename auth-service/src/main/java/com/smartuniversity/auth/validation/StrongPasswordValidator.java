package com.smartuniversity.auth.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

/**
 * Validator for strong password requirements.
 * 
 * Password must:
 * - Be at least 8 characters long
 * - Contain at least one uppercase letter (A-Z)
 * - Contain at least one lowercase letter (a-z)
 * - Contain at least one digit (0-9)
 * - Contain at least one special character (@#$%^&+=!*()_-)
 */
public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {

    // At least 8 chars, with uppercase, lowercase, digit, and special char
    private static final Pattern UPPERCASE_PATTERN = Pattern.compile(".*[A-Z].*");
    private static final Pattern LOWERCASE_PATTERN = Pattern.compile(".*[a-z].*");
    private static final Pattern DIGIT_PATTERN = Pattern.compile(".*\\d.*");
    private static final Pattern SPECIAL_CHAR_PATTERN = Pattern.compile(".*[@#$%^&+=!*()_\\-].*");

    @Override
    public void initialize(StrongPassword constraintAnnotation) {
        // No initialization needed
    }

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        if (password == null) {
            return false;
        }

        // Check minimum length
        if (password.length() < 8) {
            addConstraintViolation(context, "Password must be at least 8 characters long");
            return false;
        }

        // Check for uppercase
        if (!UPPERCASE_PATTERN.matcher(password).matches()) {
            addConstraintViolation(context, "Password must contain at least one uppercase letter");
            return false;
        }

        // Check for lowercase
        if (!LOWERCASE_PATTERN.matcher(password).matches()) {
            addConstraintViolation(context, "Password must contain at least one lowercase letter");
            return false;
        }

        // Check for digit
        if (!DIGIT_PATTERN.matcher(password).matches()) {
            addConstraintViolation(context, "Password must contain at least one digit");
            return false;
        }

        // Check for special character
        if (!SPECIAL_CHAR_PATTERN.matcher(password).matches()) {
            addConstraintViolation(context, "Password must contain at least one special character (@#$%^&+=!*()_-)");
            return false;
        }

        return true;
    }

    private void addConstraintViolation(ConstraintValidatorContext context, String message) {
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(message)
                .addConstraintViolation();
    }
}
