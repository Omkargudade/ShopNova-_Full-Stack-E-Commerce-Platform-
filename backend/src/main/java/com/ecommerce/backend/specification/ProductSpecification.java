package com.ecommerce.backend.specification;

import com.ecommerce.backend.model.Product;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class ProductSpecification {

    public static Specification<Product> filterProducts(
            String query,
            List<String> categories,
            List<String> brands,
            Double minPrice,
            Double maxPrice,
            Boolean inStockOnly,
            Double minDiscount) {

        return (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Search Query (matches name, description, category, brand, keywords)
            if (query != null && !query.trim().isEmpty()) {
                String likePattern = "%" + query.toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("name")), likePattern);
                Predicate descMatch = cb.like(cb.lower(root.get("description")), likePattern);
                Predicate catMatch = cb.like(cb.lower(root.get("category")), likePattern);
                Predicate brandMatch = cb.like(cb.lower(root.get("brand")), likePattern);
                Predicate keywordMatch = cb.like(cb.lower(root.get("keywords")), likePattern);
                predicates.add(cb.or(nameMatch, descMatch, catMatch, brandMatch, keywordMatch));
            }

            // 2. Category Filter
            if (categories != null && !categories.isEmpty()) {
                predicates.add(root.get("category").in(categories));
            }

            // 3. Brand Filter
            if (brands != null && !brands.isEmpty()) {
                predicates.add(root.get("brand").in(brands));
            }

            // 4. Price Filter
            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), maxPrice));
            }

            // 5. In Stock Only
            if (Boolean.TRUE.equals(inStockOnly)) {
                predicates.add(cb.greaterThan(root.get("stock"), 0));
            }

            // 6. Discount Filter
            if (minDiscount != null) {
                // If discount is null in DB, we treat it as 0
                Predicate discountNotNull = cb.isNotNull(root.get("discount"));
                Predicate discountGreater = cb.greaterThanOrEqualTo(root.get("discount"), minDiscount);
                predicates.add(cb.and(discountNotNull, discountGreater));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
