package com.smartcampus.backend.service;
import com.smartcampus.backend.model.Technician;
import com.smartcampus.backend.repository.TechnicianRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TechnicianService {

    @Autowired
    private TechnicianRepository technicianRepository;

    public List<Technician> getAllTechnicians() {
        return technicianRepository.findAll();
    }

    public Technician createTechnician(Technician technician) {
        if (technicianRepository.existsByTechnicianId(technician.getTechnicianId())) {
            throw new RuntimeException("Technician ID already exists");
        }
        return technicianRepository.save(technician);
    }

    public Technician updateTechnician(String id, Technician updated) {
        Technician existing = technicianRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Technician not found"));

        if (!existing.getTechnicianId().equals(updated.getTechnicianId())
            && technicianRepository.existsByTechnicianId(updated.getTechnicianId())) {
            throw new RuntimeException("Technician ID already exists");
        }

        existing.setTechnicianId(updated.getTechnicianId());
        existing.setName(updated.getName());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        existing.setSpecialization(updated.getSpecialization());
        existing.setAvailable(updated.getAvailable());
        existing.setActive(updated.getActive());
        return technicianRepository.save(existing);
    }

    public void deleteTechnician(String id) {
        if (!technicianRepository.existsById(id)) {
            throw new RuntimeException("Technician not found");
        }
        technicianRepository.deleteById(id);
    }
}
