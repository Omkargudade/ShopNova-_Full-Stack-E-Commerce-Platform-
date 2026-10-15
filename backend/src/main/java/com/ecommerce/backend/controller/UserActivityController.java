package com.ecommerce.backend.controller;

import com.ecommerce.backend.dto.ActivityRequest;
import com.ecommerce.backend.model.Product;
import com.ecommerce.backend.service.UserActivityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserActivityController {

    private final UserActivityService userActivityService;

    @PostMapping("/activity")
    public ResponseEntity<String> logActivity(@Valid @RequestBody ActivityRequest request) {
        userActivityService.logActivity(request);
        return new ResponseEntity<>("Activity logged successfully", HttpStatus.CREATED);
    }

    @GetMapping("/recommendations/{userId}")
    public ResponseEntity<List<Product>> getRecommendations(@PathVariable Long userId) {
        return ResponseEntity.ok(userActivityService.getRecommendations(userId));
    }
}
