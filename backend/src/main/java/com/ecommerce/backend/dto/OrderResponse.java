package com.ecommerce.backend.dto;

import com.ecommerce.backend.model.Order;
import com.ecommerce.backend.model.OrderItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private Order order;
    private List<OrderItem> items;
}
