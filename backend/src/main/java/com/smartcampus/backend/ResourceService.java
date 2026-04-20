package com.smartcampus.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ResourceService {

    @Autowired
    private ResourceRepository resourceRepository;

    public Resource createResource(Resource resource) {
        return resourceRepository.save(resource);
    }

    public List<Resource> getAllResources() {
        return resourceRepository.findAll();
    }

    public Optional<Resource> getResourceById(String id) {
        return resourceRepository.findById(id);
    }

    public Resource updateResource(String id, Resource updated) {
        Resource existing = resourceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Resource not found"));

        existing.setName(updated.getName());
        existing.setType(updated.getType());
        existing.setCapacity(updated.getCapacity());
        existing.setLocation(updated.getLocation());
        existing.setStatus(updated.getStatus());
        existing.setAvailabilityWindows(updated.getAvailabilityWindows());

        return resourceRepository.save(existing);
    }

    public void deleteResource(String id) {
        if (!resourceRepository.existsById(id)) {
            throw new RuntimeException("Resource not found");
        }
        resourceRepository.deleteById(id);
    }

    // Supports filters + simple sorting for better UX and marks
    public List<Resource> searchResources(String type, Integer minCapacity, String location, String status, String sortBy) {
        List<Resource> filtered = resourceRepository.findAll().stream()
                .filter(r -> type == null || type.isBlank() || r.getType().equalsIgnoreCase(type))
                .filter(r -> minCapacity == null || r.getCapacity() >= minCapacity)
                .filter(r -> location == null || location.isBlank() || r.getLocation().toLowerCase().contains(location.toLowerCase()))
                .filter(r -> status == null || status.isBlank() || r.getStatus().equalsIgnoreCase(status))
                .collect(Collectors.toList());

        if ("capacity".equalsIgnoreCase(sortBy)) {
            filtered.sort(Comparator.comparing(Resource::getCapacity));
        } else {
            filtered.sort(Comparator.comparing(Resource::getName, String.CASE_INSENSITIVE_ORDER));
        }
        return filtered;
    }
}