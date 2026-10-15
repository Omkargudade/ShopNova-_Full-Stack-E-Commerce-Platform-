package com.ecommerce.backend.service;

import com.ecommerce.backend.dto.ActivityRequest;
import com.ecommerce.backend.model.Product;
import com.ecommerce.backend.model.UserActivity;
import com.ecommerce.backend.model.Review;
import com.ecommerce.backend.repository.ProductRepository;
import com.ecommerce.backend.repository.ReviewRepository;
import com.ecommerce.backend.repository.UserActivityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserActivityService {

    private final UserActivityRepository userActivityRepository;
    private final ProductRepository productRepository;
    private final ReviewRepository reviewRepository;

    public void logActivity(ActivityRequest request) {
        UserActivity activity = UserActivity.builder()
                .userId(request.getUserId())
                .productId(request.getProductId())
                .action(request.getAction().toUpperCase())
                .timestamp(LocalDateTime.now())
                .build();
        userActivityRepository.save(activity);
    }

    public List<Product> getRecommendations(Long userId) {
        // 1. Fetch user activities
        List<UserActivity> activities = userActivityRepository.findByUserIdOrderByTimestampDesc(userId);

        if (activities.isEmpty()) {
            // If no activity, return some default products (e.g., first 5)
            return productRepository.findAll().stream().limit(5).collect(Collectors.toList());
        }

        // 2. Extract product IDs user interacted with
        Set<Long> interactedProductIds = activities.stream()
                .map(UserActivity::getProductId)
                .collect(Collectors.toSet());

        // 3. Find categories of those products
        Set<String> interestedCategories = new HashSet<>();
        for (Long productId : interactedProductIds) {
            productRepository.findById(productId).ifPresent(p -> interestedCategories.add(p.getCategory()));
        }

        // 4. Fetch recommended products from those categories
        List<Product> recommendations = new ArrayList<>();
        for (String category : interestedCategories) {
            List<Product> categoryProducts = productRepository.findByCategoryIgnoreCase(category);
            for (Product p : categoryProducts) {
                // Recommend products they haven't interacted with, or just generic similar ones
                // To keep it simple: just add products from the interested categories
                if (!recommendations.contains(p)) {
                    recommendations.add(p);
                }
            }
        }

        // Limit to 10 recommendations
        if (recommendations.size() > 10) {
            recommendations = recommendations.subList(0, 10);
        }

        recommendations.forEach(this::populateRating);
        return recommendations;
    }

    private void populateRating(Product product) {
        List<Review> reviews = reviewRepository.findByProductIdOrderByCreatedAtDesc(product.getId());
        if (reviews.isEmpty()) {
            product.setAverageRating(0.0);
            product.setReviewCount(0);
        } else {
            double avg = reviews.stream()
                    .mapToInt(Review::getRating)
                    .average()
                    .orElse(0.0);
            product.setAverageRating(avg);
            product.setReviewCount(reviews.size());
        }
    }
}
