package com.ecommerce.backend.controller;

import com.ecommerce.backend.dto.DashboardStats;
import com.ecommerce.backend.dto.OrderResponse;
import com.ecommerce.backend.model.Order;
import com.ecommerce.backend.repository.OrderRepository;
import com.ecommerce.backend.repository.ProductRepository;
import com.ecommerce.backend.repository.UserRepository;
import com.ecommerce.backend.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final OrderService orderService;

    @GetMapping("/stats")
    public ResponseEntity<DashboardStats> getDashboardStats() {
        long totalProducts = productRepository.count();
        long totalOrders = orderRepository.count();
        long totalUsers = userRepository.count();
        
        List<Order> allOrders = orderRepository.findAll();
        double totalRevenue = allOrders.stream()
                .filter(o -> !"CANCELLED".equals(o.getStatus()))
                .mapToDouble(Order::getTotalAmount)
                .sum();

        // Recent 5 orders
        List<OrderResponse> recentOrders = allOrders.stream()
                .sorted(Comparator.comparing(Order::getOrderDate).reversed())
                .limit(5)
                .map(o -> orderService.getOrderDetails(o.getId()))
                .collect(Collectors.toList());

        // Monthly sales data for current year
        Map<String, Double> monthlySales = new LinkedHashMap<>();
        String[] months = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
        for (String month : months) {
            monthlySales.put(month, 0.0);
        }
        allOrders.stream()
                .filter(o -> !"CANCELLED".equals(o.getStatus()))
                .forEach(o -> {
                    String month = o.getOrderDate().getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
                    // Only update if it's a valid English month name we pre-filled
                    if (monthlySales.containsKey(month)) {
                        monthlySales.put(month, monthlySales.get(month) + o.getTotalAmount());
                    }
                });

        Map<String, Long> statusBreakdown = new LinkedHashMap<>();
        statusBreakdown.put("DELIVERED", 0L);
        statusBreakdown.put("PENDING", 0L);
        statusBreakdown.put("SHIPPED", 0L);
        statusBreakdown.put("CANCELLED", 0L);
        
        allOrders.forEach(o -> {
            String status = o.getStatus() != null ? o.getStatus().toUpperCase() : "PENDING";
            statusBreakdown.put(status, statusBreakdown.getOrDefault(status, 0L) + 1);
        });

        List<com.ecommerce.backend.model.Product> lowStockProducts = productRepository.findAll().stream()
                .filter(p -> p.getStock() != null && p.getStock() <= 5)
                .collect(Collectors.toList());

        return ResponseEntity.ok(DashboardStats.builder()
                .totalProducts(totalProducts)
                .totalOrders(totalOrders)
                .totalUsers(totalUsers)
                .totalRevenue(totalRevenue)
                .recentOrders(recentOrders)
                .monthlySales(monthlySales)
                .orderStatusBreakdown(statusBreakdown)
                .lowStockProducts(lowStockProducts)
                .build());
    }
}
