package com.ecommerce.backend.controller;

import com.ecommerce.backend.dto.CartRequest;
import com.ecommerce.backend.model.Cart;
import com.ecommerce.backend.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @PostMapping("/add")
    public ResponseEntity<Cart> addToCart(@Valid @RequestBody CartRequest request) {
        return new ResponseEntity<>(cartService.addToCart(request), HttpStatus.CREATED);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<Cart>> getUserCart(@PathVariable Long userId) {
        return ResponseEntity.ok(cartService.getUserCart(userId));
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<Cart> updateCartQuantity(@PathVariable Long id, @RequestBody Map<String, Integer> request) {
        Integer quantity = request.get("quantity");
        return ResponseEntity.ok(cartService.updateCartQuantity(id, quantity));
    }

    @DeleteMapping("/remove/{id}")
    public ResponseEntity<Void> removeCartItem(@PathVariable Long id) {
        cartService.removeCartItem(id);
        return ResponseEntity.noContent().build();
    }
}
