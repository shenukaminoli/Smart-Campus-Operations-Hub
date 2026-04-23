package com.smartcampus.backend.repository;

import com.smartcampus.backend.model.Role;
import com.smartcampus.backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByRole(Role role);
    List<User> findByDepartment(String department);
    List<User> findByActive(boolean active);
    Optional<User> findByOauthProviderAndOauthId(String oauthProvider, String oauthId);
    List<User> findByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCase(String name, String email);
    long countByRole(Role role);
    long countByActive(boolean active);
}
