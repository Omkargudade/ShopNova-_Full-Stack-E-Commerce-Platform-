package com.ecommerce.backend.service;

import com.ecommerce.backend.exception.ResourceNotFoundException;
import com.ecommerce.backend.model.Product;
import com.ecommerce.backend.model.Review;
import com.ecommerce.backend.repository.ProductRepository;
import com.ecommerce.backend.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import com.ecommerce.backend.specification.ProductSpecification;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ReviewRepository reviewRepository;
    private final OpenAIService openAIService;

    public List<Product> getAllProducts() {
        List<Product> products = productRepository.findAll();
        products.forEach(this::populateRating);
        return products;
    }

    public Product getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
        populateRating(product);
        return product;
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

    public Product createProduct(Product product) {
        if (product.getDescription() == null || product.getDescription().isEmpty() || product.getDescription().equals("string")) {
            String aiDescription = openAIService.generateReply("Generate a compelling 2-sentence product description for a product named '" + product.getName() + "' in the category '" + product.getCategory() + "'.");
            if (aiDescription != null) {
                product.setDescription(aiDescription);
            } else {
                product.setDescription("A high-quality " + product.getName() + " from our " + (product.getCategory() != null ? product.getCategory() : "collection") + ".");
            }
        }
        return productRepository.save(product);
    }

    public Product updateProduct(Long id, Product productDetails) {
        Product existingProduct = getProductById(id);
        
        existingProduct.setName(productDetails.getName());
        existingProduct.setPrice(productDetails.getPrice());
        existingProduct.setDescription(productDetails.getDescription());
        existingProduct.setImageUrl(productDetails.getImageUrl());
        existingProduct.setCategory(productDetails.getCategory());
        existingProduct.setStock(productDetails.getStock());
        
        return productRepository.save(existingProduct);
    }

    public void deleteProduct(Long id) {
        Product existingProduct = getProductById(id);
        productRepository.delete(existingProduct);
    }

    public Page<Product> searchProducts(
            String query, List<String> categories, List<String> brands,
            Double minPrice, Double maxPrice, Boolean inStockOnly,
            Double minDiscount, Pageable pageable) {
        
        Specification<Product> spec = ProductSpecification.filterProducts(
                query, categories, brands, minPrice, maxPrice, inStockOnly, minDiscount);
        
        Page<Product> page = productRepository.findAll(spec, pageable);
        page.getContent().forEach(this::populateRating);
        return page;
    }

    public List<String> getSearchSuggestions(String query) {
        if (query == null || query.trim().isEmpty()) {
            return new ArrayList<>();
        }
        Specification<Product> spec = ProductSpecification.filterProducts(
                query, null, null, null, null, null, null);
        
        // Fetch up to 5 matching product names
        return productRepository.findAll(spec).stream()
                .map(Product::getName)
                .distinct()
                .limit(5)
                .collect(Collectors.toList());
    }

    // --- Bulk Upload Feature ---

    public List<String> uploadImages(MultipartFile[] files) {
        List<String> uploadedFileNames = new ArrayList<>();
        Path root = Paths.get("uploads").toAbsolutePath().normalize();
        
        try {
            if (!Files.exists(root)) Files.createDirectories(root);
            
            System.out.println("Starting bulk image upload to: " + root + ". Total files: " + files.length);
            
            for (MultipartFile file : files) {
                String filename = file.getOriginalFilename();
                if (filename == null || filename.isEmpty()) continue;
                
                // Security: clean path to prevent directory traversal
                filename = org.springframework.util.StringUtils.cleanPath(filename);
                
                System.out.println("Saving image: " + filename);
                Files.copy(file.getInputStream(), root.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
                uploadedFileNames.add(filename);
            }
            System.out.println("Successfully saved " + uploadedFileNames.size() + " images.");
        } catch (Exception e) {
            System.err.println("Error saving images: " + e.getMessage());
            throw new RuntimeException("Could not store images. Error: " + e.getMessage());
        }
        return uploadedFileNames;
    }

    public List<Product> bulkUpload(MultipartFile file) {
        List<Product> products = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            int count = 0;
            // Skip header if exists (name, price, category, image_name)
            boolean firstLine = true;
            
            while ((line = reader.readLine()) != null && count < 100) {
                if (firstLine) { firstLine = false; continue; }
                if (line.trim().isEmpty()) continue;
                
                try {
                    // Improved CSV split to handle spaces and potential basic quoted values
                    String[] data = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
                    if (data.length < 4) continue; 
                    
                    String name = data[0].replace("\"", "").trim();
                    Double price = Double.parseDouble(data[1].replace("\"", "").trim());
                    String category = data[2].replace("\"", "").trim();
                    String imageName = data[3].replace("\"", "").trim();
                    
                    // Construct imageUrl pointing to our /uploads folder
                    String imageUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                            .path("/uploads/")
                            .path(imageName)
                            .toUriString();

                    Product product = Product.builder()
                            .name(name)
                            .price(price)
                            .category(category)
                            .imageUrl(imageUrl)
                            .stock(10) // Default stock
                            .build();
                    
                    // Generate AI description automatically
                    String aiDescription = openAIService.generateReply("Generate a 1-sentence description for: " + name);
                    product.setDescription(aiDescription != null ? aiDescription : "Quality " + name + " in " + category);

                    products.add(productRepository.save(product));
                    count++;
                } catch (Exception rowEx) {
                    System.err.println("Skipping malformed row: " + line + ". Error: " + rowEx.getMessage());
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Fail to parse CSV file: " + e.getMessage());
        }
        return products;
    }
}
