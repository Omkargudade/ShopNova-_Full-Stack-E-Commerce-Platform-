package com.ecommerce.backend.service;

import com.ecommerce.backend.dto.OrderRequest;
import com.ecommerce.backend.dto.OrderResponse;
import com.ecommerce.backend.exception.ResourceNotFoundException;
import com.ecommerce.backend.model.Cart;
import com.ecommerce.backend.model.Order;
import com.ecommerce.backend.model.OrderItem;
import com.ecommerce.backend.model.Product;
import com.ecommerce.backend.repository.CartRepository;
import com.ecommerce.backend.repository.OrderItemRepository;
import com.ecommerce.backend.repository.OrderRepository;
import com.ecommerce.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;

    @Transactional
    public OrderResponse placeOrder(OrderRequest request) {
        Long userId = request.getUserId();
        
        // 1. Fetch user cart
        List<Cart> cartItems = cartRepository.findByUserId(userId);
        if (cartItems.isEmpty()) {
            throw new IllegalArgumentException("Cart is empty for user: " + userId);
        }

        double totalAmount = 0.0;
        List<OrderItem> orderItems = new ArrayList<>();

        // 2. Validate product availability and calculate total
        for (Cart cartItem : cartItems) {
            Product product = productRepository.findById(cartItem.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + cartItem.getProductId()));
            
            if (product.getStock() < cartItem.getQuantity()) {
                throw new IllegalArgumentException("Not enough stock for product: " + product.getName());
            }

            // Optional: decrease stock here
            // product.setStock(product.getStock() - cartItem.getQuantity());
            // productRepository.save(product);

            double price = product.getPrice();
            totalAmount += price * cartItem.getQuantity();

            OrderItem orderItem = OrderItem.builder()
                    .productId(product.getId())
                    .quantity(cartItem.getQuantity())
                    .price(price)
                    // orderId will be set after order is saved
                    .build();
            orderItems.add(orderItem);
        }

        // 3. Create order
        Order order = Order.builder()
                .userId(userId)
                .totalAmount(totalAmount)
                .orderDate(LocalDateTime.now())
                .status("PENDING")
                .paymentStatus("PENDING")
                .shippingAddress(request.getShippingAddress())
                .customerPhone(request.getPhone())
                .build();
        
        Order savedOrder = orderRepository.save(order);

        // 4. Save order items
        for (OrderItem item : orderItems) {
            item.setOrderId(savedOrder.getId());
        }
        List<OrderItem> savedOrderItems = orderItemRepository.saveAll(orderItems);

        // 5. Clear cart
        cartRepository.deleteAll(cartItems);

        return OrderResponse.builder()
                .order(savedOrder)
                .items(savedOrderItems)
                .build();
    }

    public List<OrderResponse> getUserOrders(Long userId) {
        List<Order> orders = orderRepository.findByUserId(userId);
        return orders.stream().map(this::mapToOrderResponse).collect(Collectors.toList());
    }

    public OrderResponse getOrderDetails(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        return mapToOrderResponse(order);
    }


    public List<OrderResponse> getAllOrders() {
        List<Order> orders = orderRepository.findAll();
        return orders.stream().map(this::mapToOrderResponse).collect(Collectors.toList());
    }

    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        order.setStatus(status);
        return mapToOrderResponse(orderRepository.save(order));
    }

    private OrderResponse mapToOrderResponse(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        return OrderResponse.builder()
                .order(order)
                .items(items)
                .build();
    }
}
