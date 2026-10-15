package com.ecommerce.backend.controller;

import com.ecommerce.backend.model.Product;
import com.ecommerce.backend.model.User;
import com.ecommerce.backend.model.Wishlist;
import com.ecommerce.backend.repository.ProductRepository;
import com.ecommerce.backend.repository.UserRepository;
import com.ecommerce.backend.repository.WishlistRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/wishlist")
@CrossOrigin(origins = "*")
public class WishlistController {

    @Autowired
    private WishlistRepository wishlistRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @PostMapping("/add")
    public ResponseEntity<?> addToWishlist(@RequestBody Map<String, Long> request) {
        Long userId = request.get("userId");
        Long productId = request.get("productId");

        if (userId == null || productId == null) {
            return ResponseEntity.badRequest().body("User ID and Product ID are required");
        }

        Optional<Wishlist> existing = wishlistRepository.findByUserIdAndProductId(userId, productId);
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body("Product is already in wishlist");
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user != null && ("ADMIN".equals(user.getRole()) || "ROLE_ADMIN".equals(user.getRole()))) {
            return ResponseEntity.badRequest().body("Administrators are not permitted to use customer shopping features.");
        }
        Product product = productRepository.findById(productId).orElse(null);

        if (user == null || product == null) {
            return ResponseEntity.badRequest().body("Invalid user or product");
        }

        Wishlist wishlist = new Wishlist();
        wishlist.setUser(user);
        wishlist.setProduct(product);
        wishlistRepository.save(wishlist);

        return ResponseEntity.ok(Map.of("message", "Added to wishlist successfully"));
    }

    @DeleteMapping("/remove/{userId}/{productId}")
    public ResponseEntity<?> removeFromWishlist(@PathVariable Long userId, @PathVariable Long productId) {
        Optional<Wishlist> existing = wishlistRepository.findByUserIdAndProductId(userId, productId);
        if (existing.isPresent()) {
            wishlistRepository.delete(existing.get());
            return ResponseEntity.ok(Map.of("message", "Removed from wishlist successfully"));
        }
        return ResponseEntity.badRequest().body("Item not found in wishlist");
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserWishlist(@PathVariable Long userId) {
        List<Wishlist> wishlists = wishlistRepository.findByUserId(userId);
        return ResponseEntity.ok(wishlists.stream().map(Wishlist::getProduct).toList());
    }

    @GetMapping("/count/{userId}")
    public ResponseEntity<?> getWishlistCount(@PathVariable Long userId) {
        long count = wishlistRepository.countByUserId(userId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @GetMapping("/check/{userId}/{productId}")
    public ResponseEntity<?> checkInWishlist(@PathVariable Long userId, @PathVariable Long productId) {
        Optional<Wishlist> existing = wishlistRepository.findByUserIdAndProductId(userId, productId);
        return ResponseEntity.ok(Map.of("inWishlist", existing.isPresent()));
    }
}
