package com.smartuniversity.auth.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartuniversity.auth.web.dto.ChangePasswordRequest;
import com.smartuniversity.auth.web.dto.LoginRequest;
import com.smartuniversity.auth.web.dto.RegisterRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private RegisterRequest registerRequest;

    // Strong password that meets requirements: 8+ chars, uppercase, lowercase, digit, special char
    private static final String TEST_PASSWORD = "SecurePass123!";

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest();
        registerRequest.setUsername("alice");
        registerRequest.setPassword(TEST_PASSWORD);
        registerRequest.setTenantId("engineering");
    }

    @Test
    void registerAndLoginShouldReturnJwt() throws Exception {
        // register
        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token", notNullValue()));

        // login
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("alice");
        loginRequest.setPassword(TEST_PASSWORD);
        loginRequest.setTenantId("engineering");

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()));
    }

    @Test
    void changePasswordShouldSucceedWithValidCredentials() throws Exception {
        // First register a user
        RegisterRequest newUser = new RegisterRequest();
        newUser.setUsername("passwordchangeuser");
        newUser.setPassword(TEST_PASSWORD);
        newUser.setTenantId("engineering");

        MvcResult registerResult = mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newUser)))
                .andExpect(status().isCreated())
                .andReturn();

        // Extract user ID from JWT (simplified - in real test you'd decode the JWT)
        String responseBody = registerResult.getResponse().getContentAsString();
        String token = objectMapper.readTree(responseBody).get("token").asText();
        
        // Decode JWT to get user ID (base64 decode the payload)
        String[] parts = token.split("\\.");
        String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
        String userId = objectMapper.readTree(payload).get("sub").asText();

        // Change password with correct current password
        ChangePasswordRequest changeRequest = new ChangePasswordRequest();
        changeRequest.setCurrentPassword(TEST_PASSWORD);
        changeRequest.setNewPassword("NewSecurePass456!");

        mockMvc.perform(post("/auth/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-User-Id", userId)
                .header("X-Tenant-Id", "engineering")
                .content(objectMapper.writeValueAsString(changeRequest)))
                .andExpect(status().isOk());

        // Verify old password no longer works
        LoginRequest oldLogin = new LoginRequest();
        oldLogin.setUsername("passwordchangeuser");
        oldLogin.setPassword(TEST_PASSWORD);
        oldLogin.setTenantId("engineering");

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(oldLogin)))
                .andExpect(status().isUnauthorized());

        // Verify new password works
        LoginRequest newLogin = new LoginRequest();
        newLogin.setUsername("passwordchangeuser");
        newLogin.setPassword("NewSecurePass456!");
        newLogin.setTenantId("engineering");

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()));
    }

    @Test
    void changePasswordShouldFailWithWrongCurrentPassword() throws Exception {
        // First register a user
        RegisterRequest newUser = new RegisterRequest();
        newUser.setUsername("wrongpassuser");
        newUser.setPassword(TEST_PASSWORD);
        newUser.setTenantId("engineering");

        MvcResult registerResult = mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newUser)))
                .andExpect(status().isCreated())
                .andReturn();

        // Extract user ID from JWT
        String responseBody = registerResult.getResponse().getContentAsString();
        String token = objectMapper.readTree(responseBody).get("token").asText();
        String[] parts = token.split("\\.");
        String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
        String userId = objectMapper.readTree(payload).get("sub").asText();

        // Try to change password with wrong current password
        ChangePasswordRequest changeRequest = new ChangePasswordRequest();
        changeRequest.setCurrentPassword("WrongPassword123!");
        changeRequest.setNewPassword("NewSecurePass456!");

        mockMvc.perform(post("/auth/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-User-Id", userId)
                .header("X-Tenant-Id", "engineering")
                .content(objectMapper.writeValueAsString(changeRequest)))
                .andExpect(status().isBadRequest());
    }
}