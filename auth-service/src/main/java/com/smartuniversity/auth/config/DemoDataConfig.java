package com.smartuniversity.auth.config;

import com.smartuniversity.auth.domain.Role;
import com.smartuniversity.auth.domain.User;
import com.smartuniversity.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Seeds demo user accounts when running in demo profile.
 * 
 * Default accounts (passwords meet validation requirements):
 * - admin / Admin123! (ADMIN role)
 * - teacher / Teacher123! (TEACHER role)
 * - student / Student123! (STUDENT role)
 * 
 * All accounts are created in the "engineering" tenant.
 */
@Configuration
@Profile("demo")
public class DemoDataConfig {

    private static final Logger logger = LoggerFactory.getLogger(DemoDataConfig.class);
    private static final String DEMO_TENANT = "engineering";

    @Bean
    CommandLineRunner seedDemoUsers(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            createUserIfNotExists(userRepository, passwordEncoder, "admin", "Admin123!", Role.ADMIN);
            createUserIfNotExists(userRepository, passwordEncoder, "teacher", "Teacher123!", Role.TEACHER);
            createUserIfNotExists(userRepository, passwordEncoder, "student", "Student123!", Role.STUDENT);
            
            logger.info("==============================================");
            logger.info("Demo accounts ready (tenant: {})", DEMO_TENANT);
            logger.info("  admin / Admin123! (ADMIN)");
            logger.info("  teacher / Teacher123! (TEACHER)");
            logger.info("  student / Student123! (STUDENT)");
            logger.info("==============================================");
        };
    }

    private void createUserIfNotExists(UserRepository userRepository, 
                                        PasswordEncoder passwordEncoder,
                                        String username, 
                                        String password, 
                                        Role role) {
        if (!userRepository.existsByUsernameAndTenantId(username, DEMO_TENANT)) {
            User user = new User();
            user.setUsername(username);
            user.setPasswordHash(passwordEncoder.encode(password));
            user.setRole(role);
            user.setTenantId(DEMO_TENANT);
            userRepository.save(user);
            logger.info("Created demo user: {} with role {} in tenant {}", username, role, DEMO_TENANT);
        } else {
            logger.info("Demo user already exists: {} in tenant {}", username, DEMO_TENANT);
        }
    }
}
