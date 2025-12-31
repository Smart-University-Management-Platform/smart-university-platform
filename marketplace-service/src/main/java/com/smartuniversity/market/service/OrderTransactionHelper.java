package com.smartuniversity.market.service;

import com.smartuniversity.market.domain.Order;
import com.smartuniversity.market.domain.OrderItem;
import com.smartuniversity.market.domain.OrderStatus;
import com.smartuniversity.market.domain.Product;
import com.smartuniversity.market.repository.OrderRepository;
import com.smartuniversity.market.repository.ProductRepository;
import com.smartuniversity.market.web.dto.CheckoutRequest;
import com.smartuniversity.market.web.dto.OrderItemRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.*;

/**
 * Helper class for transactional operations in the Order Saga.
 * 
 * This is needed because Spring's proxy-based AOP doesn't intercept
 * self-invocation (calling @Transactional methods from within the same class).
 */
@Component
public class OrderTransactionHelper {

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    public OrderTransactionHelper(ProductRepository productRepository, OrderRepository orderRepository) {
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
    }

    @Transactional
    public Order createPendingOrder(String tenantId, UUID buyerId, CheckoutRequest request) {
        Map<UUID, Integer> quantities = new HashMap<>();
        for (OrderItemRequest item : request.getItems()) {
            if (item.getQuantity() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be positive");
            }
            quantities.merge(item.getProductId(), item.getQuantity(), Integer::sum);
        }

        List<Product> products = productRepository.findAllById(quantities.keySet());
        if (products.size() != quantities.size()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "One or more products not found");
        }

        // Validate tenant access (but NOT stock - that's checked after payment)
        for (Product product : products) {
            if (!tenantId.equals(product.getTenantId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cross-tenant product access is not allowed");
            }
        }

        BigDecimal total = BigDecimal.ZERO;
        Order order = new Order();
        order.setTenantId(tenantId);
        order.setBuyerId(buyerId);
        order.setStatus(OrderStatus.PENDING);

        List<OrderItem> items = new ArrayList<>();
        for (Product product : products) {
            int quantity = quantities.get(product.getId());
            BigDecimal itemTotal = product.getPrice().multiply(BigDecimal.valueOf(quantity));
            total = total.add(itemTotal);

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProduct(product);
            orderItem.setQuantity(quantity);
            orderItem.setPrice(product.getPrice());
            items.add(orderItem);
        }

        order.setTotalAmount(total);
        order.setItems(items);

        return orderRepository.save(order);
    }

    @Transactional
    public void confirmOrderAndDecrementStock(String tenantId, UUID orderId) {
        Order order = orderRepository.findByIdAndTenantId(orderId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Order is not pending");
        }

        // Use pessimistic locking to prevent race conditions
        for (OrderItem item : order.getItems()) {
            UUID productId = item.getProduct().getId();
            
            Product product = productRepository.findByIdAndTenantIdForUpdate(productId, tenantId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

            if (product.getStock() < item.getQuantity()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Insufficient stock for product " + product.getName());
            }

            product.setStock(product.getStock() - item.getQuantity());
            productRepository.save(product);
        }

        order.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(order);
    }

    @Transactional
    public void markOrderCanceled(String tenantId, UUID orderId) {
        orderRepository.findByIdAndTenantId(orderId, tenantId).ifPresent(order -> {
            order.setStatus(OrderStatus.CANCELED);
            orderRepository.save(order);
        });
    }
}
