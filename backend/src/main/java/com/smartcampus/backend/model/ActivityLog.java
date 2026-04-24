package com.smartcampus.backend.model;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "activityLogs")
public class ActivityLog {

    @Id
    private String id;

    private String userId;
    private String userEmail;
    private String userName;
    private String action;
    private String description;
    private String targetType;
    private String targetId;
    private String ipAddress;

    @CreatedDate
    private LocalDateTime createdAt;
}
