package com.ecommerce.backend.service;

import com.ecommerce.backend.dto.CartRequest;
import com.ecommerce.backend.exception.ResourceNotFoundException;
import com.ecommerce.backend.model.Cart;
import com.ecommerce.backend.model.Product;
import com.ecommerce.backend.repository.CartRepository;
import com.ecommerce.backend.repository.ProductRepository;
import com.ecommerce.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public Cart addToCart(CartRequest request) {
        // Validate user is not admin
        com.ecommerce.backend.model.User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getUserId()));
        if ("ADMIN".equals(user.getRole()) || "ROLE_ADMIN".equals(user.getRole())) {
            throw new IllegalArgumentException("Administrators are not permitted to use customer shopping features.");
        }

        // Validate product existence
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + request.getProductId()));

        Optional<Cart> existingCartItem = cartRepository.findByUserIdAndProductId(request.getUserId(), request.getProductId());

        if (existingCartItem.isPresent()) {
            Cart cartItem = existingCartItem.get();
            cartItem.setQuantity(cartItem.getQuantity() + request.getQuantity());
            return cartRepository.save(cartItem);
        } else {
            Cart newCartItem = Cart.builder()
                    .userId(request.getUserId())
                    .productId(request.getProductId())
                    .quantity(request.getQuantity())
                    .build();
            return cartRepository.save(newCartItem);
        }
    }

    public List<Cart> getUserCart(Long userId) {
        return cartRepository.findByUserId(userId);
    }

    public Cart updateCartQuantity(Long cartItemId, Integer quantity) {
        Cart cartItem = cartRepository.findById(cartItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found with id: " + cartItemId));

        cartItem.setQuantity(quantity);
        return cartRepository.save(cartItem);
    }

    public void removeCartItem(Long cartItemId) {
        Cart cartItem = cartRepository.findById(cartItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found with id: " + cartItemId));
        
        cartRepository.delete(cartItem);
    }
}
