package com.ecommerce.backend.dto;

import lombok.Builder;
import lombok.Data;
import com.ecommerce.backend.model.Product;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class DashboardStats {
    private long totalProducts;
    private long totalOrders;
    private long totalUsers;
    private double totalRevenue;
    private List<OrderResponse> recentOrders;
    private Map<String, Double> monthlySales;
    private Map<String, Long> orderStatusBreakdown;
    private List<Product> lowStockProducts;
}
