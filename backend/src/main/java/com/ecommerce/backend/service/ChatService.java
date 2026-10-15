package com.ecommerce.backend.service;

import com.ecommerce.backend.dto.ChatRequest;
import com.ecommerce.backend.dto.ChatResponse;
import com.ecommerce.backend.model.Product;
import com.ecommerce.backend.repository.ProductRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ProductRepository productRepository;
    private final OpenAIService openAIService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChatResponse processChatMessage(ChatRequest request) {
        String message = request.getMessage();
        return getAIResponse(message);
    }

    /**
     * Phase 2 Ready: This method can be integrated with OpenAI or another LLM.
     * For Phase 1, it uses a smart keyword-based mock implementation.
     */
    private ChatResponse getAIResponse(String message) {
        String reply = "";
        List<Product> suggestedProducts = new ArrayList<>();

        // 1. Try Advanced AI Search first
        String filterJson = openAIService.extractSearchFilters(message);
        if (filterJson != null) {
            try {
                JsonNode filters = objectMapper.readTree(filterJson);
                String productName = filters.path("product_name").asText("");
                String category = filters.path("category").asText("");
                
                // Map common synonyms to our categories
                if (productName.toLowerCase().contains("phone") || category.toLowerCase().contains("phone") || 
                    productName.toLowerCase().contains("mobile")) {
                    category = "Mobiles";
                }

                Double minPrice = filters.has("price_min") && !filters.path("price_min").isNull() ? filters.path("price_min").asDouble() : 0.0;
                Double maxPrice = filters.has("price_max") && !filters.path("price_max").isNull() ? filters.path("price_max").asDouble() : Double.MAX_VALUE;

                if (!category.isEmpty()) {
                    suggestedProducts = productRepository.findByCategoryIgnoreCaseAndPriceBetween(category, minPrice, maxPrice);
                } 
                
                // If category search found nothing, try name search
                if (suggestedProducts.isEmpty() && !productName.isEmpty()) {
                    suggestedProducts = productRepository.findByNameContainingIgnoreCase(productName).stream()
                            .filter(p -> p.getPrice() >= minPrice && p.getPrice() <= maxPrice)
                            .collect(Collectors.toList());
                }

                if (!suggestedProducts.isEmpty()) {
                    String aiReply = openAIService.generateReply("The user is asking: " + message + ". I found these products: " + 
                        suggestedProducts.stream().map(Product::getName).collect(Collectors.joining(", ")) + 
                        ". Please provide a helpful response referring to these products.");
                    reply = (aiReply != null) ? aiReply : "I found some great options for you matching your criteria!";
                    return ChatResponse.builder().reply(reply).products(suggestedProducts).build();
                }
            } catch (Exception e) {
                System.err.println("Failed to parse AI filter JSON: " + e.getMessage());
            }
        }

        // 2. Fallback to Smart Keyword Search
        suggestedProducts = new ArrayList<>();
        String lowMessage = message.toLowerCase();
        
        // Extract price from message if possible (e.g., "under 25000")
        double budgetLimit = Double.MAX_VALUE;
        if (lowMessage.contains("under") || lowMessage.contains("below")) {
            String[] parts = lowMessage.split(" ");
            for (String part : parts) {
                try {
                    budgetLimit = Double.parseDouble(part.replaceAll("[^0-9]", ""));
                    if (budgetLimit > 100) break; // Found a likely price
                } catch (Exception ignored) {}
            }
        }

        // FAQ Check
        if (lowMessage.contains("return") || lowMessage.contains("policy")) {
            reply = "Our return policy allows you to return items within 30 days of delivery.";
            return ChatResponse.builder().reply(reply).products(suggestedProducts).build();
        }

        // Smart Keyword Check
        List<Product> allProducts = productRepository.findAll();
        String[] keywords = {"laptop", "phone", "shoes", "watch", "camera", "bag"};
        
        for (String keyword : keywords) {
            if (lowMessage.matches(".*\\b" + keyword + "\\b.*")) {
                String searchCategory = keyword;
                if (keyword.equals("phone")) searchCategory = "Mobiles";

                double finalBudgetLimit = budgetLimit;
                String finalSearchCategory = searchCategory;

                suggestedProducts.addAll(allProducts.stream()
                        .filter(p -> p.getName().toLowerCase().contains(keyword) || 
                                     (p.getCategory() != null && (p.getCategory().equalsIgnoreCase(finalSearchCategory) || 
                                      p.getCategory().toLowerCase().contains(keyword))))
                        .filter(p -> p.getPrice() <= finalBudgetLimit)
                        .collect(Collectors.toList()));
            }
        }

        if (!suggestedProducts.isEmpty()) {
            suggestedProducts = suggestedProducts.stream().distinct().limit(5).collect(Collectors.toList());
            String aiReply = openAIService.generateReply("The user wants " + message + ". I found: " + 
                suggestedProducts.stream().map(Product::getName).collect(Collectors.joining(", ")));
            reply = (aiReply != null) ? aiReply : "I found some great options for you under your budget!";
        } else {
            String aiReply = openAIService.generateReply(message);
            reply = (aiReply != null) ? aiReply : "I'm your AI shopping assistant! How can I help you today?";
        }

        return ChatResponse.builder().reply(reply).products(suggestedProducts).build();
    }
}
