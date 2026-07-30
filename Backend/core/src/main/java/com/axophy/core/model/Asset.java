package com.axophy.core.model;

import jakarta.persistence.*;

@Entity
@Table(name = "assets")
public class Asset {

    @Id
    private Integer id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "limittemp")
    private Double limitTemp;

    @Column(name = "limitcurr")
    private Double limitCurr;

    @Column(name = "limitvib")
    private Double limitVib;

    @Column(length = 20)
    private String state;

    public Asset() {}

    // Getters e Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Double getLimitTemp() { return limitTemp; }
    public void setLimitTemp(Double limitTemp) { this.limitTemp = limitTemp; }

    public Double getLimitCurr() { return limitCurr; }
    public void setLimitCurr(Double limitCurr) { this.limitCurr = limitCurr; }

    public Double getLimitVib() { return limitVib; }
    public void setLimitVib(Double limitVib) { this.limitVib = limitVib; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
}