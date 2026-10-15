package com.ecommerce.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Product name is mandatory")
    @Column(nullable = false)
    private String name;

    @Min(value = 0, message = "Price must be greater than or equal to 0")
    @Column(nullable = false)
    private Double price;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String imageUrl;

    private String category;

    @Min(value = 0, message = "Stock cannot be negative")
    private Integer stock;

    private String brand;

    @Min(value = 0, message = "Discount cannot be negative")
    private Double discount;

    @Column(columnDefinition = "TEXT")
    private String keywords;

    @Transient
    private Double averageRating;

    @Transient
    private Integer reviewCount;
}
