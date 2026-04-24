package com.smartcampus.backend.service;

import com.smartcampus.backend.model.ActivityLog;
import com.smartcampus.backend.repository.ActivityLogRepository;
import com.smartcampus.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ActivityLogService {

    private static final Logger log = LoggerFactory.getLogger(ActivityLogService.class);

    @Autowired
    private ActivityLogRepository activityLogRepository;

    @Autowired
    private UserRepository userRepository;

    public ActivityLog logActivity(String userId, String userEmail, String userName,
                                   String action, String description,
                                   String targetType, String targetId) {
        ActivityLog entry = new ActivityLog();
        entry.setUserId(userId != null ? userId : "");
        entry.setUserEmail(userEmail != null ? userEmail : "");
        entry.setUserName(userName != null ? userName : "");
        entry.setAction(action);
        entry.setDescription(description);
        entry.setTargetType(targetType);
        entry.setTargetId(targetId);
        return activityLogRepository.save(entry);
    }

    // Convenience: look up user details by userId
    public void logByUserId(String userId, String action, String description,
                            String targetType, String targetId) {
        try {
            String email = "";
            String name = "";
            if (userId != null && !userId.isBlank()) {
                var userOpt = userRepository.findById(userId);
                if (userOpt.isPresent()) {
                    email = userOpt.get().getEmail();
                    name = userOpt.get().getFullName();
                }
            }
            logActivity(userId, email, name, action, description, targetType, targetId);
        } catch (Exception e) {
            log.error("Failed to log activity by userId: {}", e.getMessage());
        }
    }

    // Convenience: look up user details by email
    public void logByUserEmail(String email, String action, String description,
                               String targetType, String targetId) {
        try {
            String userId = "";
            String name = "";
            if (email != null && !email.isBlank()) {
                var userOpt = userRepository.findByEmail(email);
                if (userOpt.isPresent()) {
                    userId = userOpt.get().getId();
                    name = userOpt.get().getFullName();
                }
            }
            logActivity(userId, email, name, action, description, targetType, targetId);
        } catch (Exception e) {
            log.error("Failed to log activity by email: {}", e.getMessage());
        }
    }

    public List<ActivityLog> getAllLogs() {
        return activityLogRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<ActivityLog> getLogsByUser(String userId) {
        return activityLogRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<ActivityLog> getLogsByAction(String action) {
        return activityLogRepository.findByActionOrderByCreatedAtDesc(action);
    }

    public List<ActivityLog> getRecentLogs(int limit) {
        return activityLogRepository.findAllByOrderByCreatedAtDesc()
                .stream().limit(limit).collect(Collectors.toList());
    }
}
