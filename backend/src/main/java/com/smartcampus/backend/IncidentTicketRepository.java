package com.smartcampus.backend;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentTicketRepository extends MongoRepository<IncidentTicket, String> {
    List<IncidentTicket> findByStatus(String status);
    List<IncidentTicket> findByReportedBy(String reportedBy);
    List<IncidentTicket> findByAssignedTechnicianId(String assignedTechnicianId);
}
