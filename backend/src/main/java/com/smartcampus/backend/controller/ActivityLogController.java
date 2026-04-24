package com.smartcampus.backend.controller;

import com.smartcampus.backend.model.ActivityLog;
import com.smartcampus.backend.service.ActivityLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activity-logs")
@CrossOrigin(origins = "*")
public class ActivityLogController {

    @Autowired
    private ActivityLogService activityLogService;

    @GetMapping
    public ResponseEntity<List<ActivityLog>> getAllLogs() {
        return ResponseEntity.ok(activityLogService.getAllLogs());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ActivityLog>> getLogsByUser(@PathVariable String userId) {
        return ResponseEntity.ok(activityLogService.getLogsByUser(userId));
    }

    @GetMapping("/action/{action}")
    public ResponseEntity<List<ActivityLog>> getLogsByAction(@PathVariable String action) {
        return ResponseEntity.ok(activityLogService.getLogsByAction(action.toUpperCase()));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<ActivityLog>> getRecentLogs(
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(activityLogService.getRecentLogs(limit));
    }
}
