package com.ecommerce.backend.controller;

import com.ecommerce.backend.model.Review;
import com.ecommerce.backend.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<Review> addReview(@Valid @RequestBody Review review) {
        return new ResponseEntity<>(reviewService.addReview(review), HttpStatus.CREATED);
    }

    @GetMapping("/{productId}")
    public ResponseEntity<List<Review>> getReviewsByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(reviewService.getReviewsByProductId(productId));
    }

    @GetMapping("/average/{productId}")
    public ResponseEntity<Map<String, Double>> getAverageRating(@PathVariable Long productId) {
        return ResponseEntity.ok(Map.of("averageRating", reviewService.getAverageRating(productId)));
    }
}
