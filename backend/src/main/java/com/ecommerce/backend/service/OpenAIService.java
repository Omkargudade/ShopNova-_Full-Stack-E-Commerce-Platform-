package com.ecommerce.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OpenAIService {

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public String extractSearchFilters(String userMessage) {
        String prompt = "You are an AI search assistant for an e-commerce website.\n\n" +
                "Your task is to understand the user query and extract structured search filters.\n\n" +
                "From the user input, identify:\n" +
                "- product_name (what item user wants)\n" +
                "- category (if mentioned)\n" +
                "- price_range (min and max in Indian Rupees if mentioned)\n" +
                "- features (like size, color, brand, usage)\n" +
                "- sorting_preference (cheap, best, latest, etc.)\n\n" +
                "Rules:\n" +
                "- If price is not given, keep it null\n" +
                "- If category is not clear, guess the closest one\n" +
                "- All prices are in Indian Rupees (Rs.)\n" +
                "- Keep output clean and structured\n\n" +
                "Return result in JSON format like:\n" +
                "{\n" +
                "  \"product_name\": \"\",\n" +
                "  \"category\": \"\",\n" +
                "  \"price_min\": null,\n" +
                "  \"price_max\": null,\n" +
                "  \"features\": [],\n" +
                "  \"sort_by\": \"\"\n" +
                "}\n\n" +
                "User query: " + userMessage;

        return generateReplyWithPrompt("Search Assistant", prompt, true);
    }

    private String generateReplyWithPrompt(String systemRole, String userMessage, boolean isJson) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemRole));
            messages.add(Map.of("role", "user", "content", userMessage));

            Map<String, Object> requestBody = new HashMap<>();
            // Use a slightly more specific model version that supports json_object reliably
            requestBody.put("model", "gpt-3.5-turbo-0125"); 
            requestBody.put("messages", messages);
            requestBody.put("max_tokens", 500);
            
            if (isJson) {
                requestBody.put("response_format", Map.of("type", "json_object"));
            }

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List choices = (List) response.getBody().get("choices");
                if (!choices.isEmpty()) {
                    Map choice = (Map) choices.get(0);
                    Map message = (Map) choice.get("message");
                    String content = (String) message.get("content");
                    return isJson ? cleanJsonResponse(content) : content;
                }
            }
            return null;
        } catch (Exception e) {
            System.err.println("Error communicating with AI: " + e.getMessage());
            return null;
        }
    }

    private String cleanJsonResponse(String content) {
        if (content == null) return null;
        String cleaned = content.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }

    public String generateReply(String userMessage) {
        return generateReplyWithPrompt("You are a helpful shopping assistant for 'ShopNova' e-commerce website. Help users find products and answer questions.", userMessage, false);
    }
}
