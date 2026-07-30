package com.axophy.core.repository;

import com.axophy.core.model.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Integer> {
    // Só de herdar de JpaRepository, o Spring já cria automaticamente os comandos:
    // save(), findById(), findAll(), deleteById()
}