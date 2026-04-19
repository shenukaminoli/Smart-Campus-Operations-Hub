package com.smartcampus.backend;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResourceRepository extends MongoRepository<Resource, String> {
    List<Resource> findByTypeIgnoreCase(String type);
    List<Resource> findByStatusIgnoreCase(String status);
    List<Resource> findByLocationContainingIgnoreCase(String location);
}