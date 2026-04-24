package com.smartcampus.backend.service;

import com.smartcampus.backend.model.Role;
import com.smartcampus.backend.model.User;
import com.smartcampus.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    public User createUser(User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email already registered");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getRole() == null) {
            user.setRole(Role.STUDENT);
        }
        user.setActive(true);
        return userRepository.save(user);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getUserById(String id) {
        return userRepository.findById(id);
    }

    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public List<User> getUsersByRole(Role role) {
        return userRepository.findByRole(role);
    }

    public List<User> getUsersByDepartment(String department) {
        return userRepository.findByDepartment(department);
    }

    public User updateUser(String id, User updated) {
        User existing = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        existing.setFullName(updated.getFullName());
        existing.setPhone(updated.getPhone());
        existing.setDepartment(updated.getDepartment());
        existing.setProfileImageUrl(updated.getProfileImageUrl());
        return userRepository.save(existing);
    }

    public User updateUserRole(String id, Role role) {
        User existing = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        existing.setRole(role);
        return userRepository.save(existing);
    }

    public User deactivateUser(String id) {
        User existing = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        existing.setActive(false);
        return userRepository.save(existing);
    }

    public User activateUser(String id) {
        User existing = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        existing.setActive(true);
        return userRepository.save(existing);
    }

    public void deleteUser(String id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("User not found");
        }
        userRepository.deleteById(id);
    }

    public Optional<User> authenticateUser(String email, String password) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent() && passwordEncoder.matches(password, userOpt.get().getPassword())) {
            return userOpt;
        }
        return Optional.empty();
    }

    public User findOrCreateOAuthUser(String oauthProvider, String oauthId,
                                       String email, String fullName, String profileImageUrl) {
        // 1. Check if we already have this OAuth user
        Optional<User> existingOAuth = userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId);
        if (existingOAuth.isPresent()) {
            return existingOAuth.get();
        }

        // 2. Check if a user with this email already exists (registered normally)
        Optional<User> existingEmail = userRepository.findByEmail(email);
        if (existingEmail.isPresent()) {
            User user = existingEmail.get();
            user.setOauthProvider(oauthProvider);
            user.setOauthId(oauthId);
            if (profileImageUrl != null) {
                user.setProfileImageUrl(profileImageUrl);
            }
            return userRepository.save(user);
        }

        // 3. Create a brand new OAuth user
        User newUser = new User();
        newUser.setFullName(fullName);
        newUser.setEmail(email);
        newUser.setPassword(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
        newUser.setRole(Role.STUDENT);
        newUser.setActive(true);
        newUser.setOauthProvider(oauthProvider);
        newUser.setOauthId(oauthId);
        newUser.setProfileImageUrl(profileImageUrl);
        return userRepository.save(newUser);
    }
}
