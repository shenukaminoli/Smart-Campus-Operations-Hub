package com.smartcampus.backend.model;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "notifications")
public class Notification {

    @Id
    private String id;

    private String recipientId;
    private String type;
    private String title;
    private String message;
    private String referenceId;
    private String referenceType;
    private boolean read = false;

    @CreatedDate
    private LocalDateTime createdAt;
}
