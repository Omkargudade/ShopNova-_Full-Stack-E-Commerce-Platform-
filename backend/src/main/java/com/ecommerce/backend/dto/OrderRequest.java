package com.ecommerce.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OrderRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    private String shippingAddress;
    private String phone;
}
