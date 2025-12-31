package com.smartuniversity.market.service;

import com.smartuniversity.common.events.OrderConfirmedEvent;
import com.smartuniversity.market.domain.Order;
import com.smartuniversity.market.domain.OrderStatus;
import com.smartuniversity.market.repository.OrderRepository;
import com.smartuniversity.market.web.dto.CheckoutRequest;
import com.smartuniversity.market.web.dto.OrderDto;
import com.smartuniversity.market.web.dto.OrderItemDto;
import com.smartuniversity.market.web.dto.PaymentAuthorizationRequest;
import com.smartuniversity.market.web.dto.PaymentResponse;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Orchestrates the multi-step Saga for Marketplace checkout.
 * 
 * IMPROVEMENTS:
 * 1. Using pessimistic locking (findByIdAndTenantIdForUpdate) to prevent race conditions
 * 2. Added order history endpoints (getUserOrders, getOrder)
 * 3. toDto now includes createdAt
 * 
 * NOTE: checkout() intentionally does NOT have @Transactional because it calls
 * external services (payment). Each step has its own transaction boundary
 * managed by OrderTransactionHelper to ensure proper AOP proxy interception.
 */
@Service
public class OrderSagaService {

    private final OrderRepository orderRepository;
    private final PaymentClient paymentClient;
    private final RabbitTemplate rabbitTemplate;
    private final OrderTransactionHelper transactionHelper;

    public OrderSagaService(OrderRepository orderRepository,
            PaymentClient paymentClient,
            RabbitTemplate rabbitTemplate,
            OrderTransactionHelper transactionHelper) {
        this.orderRepository = orderRepository;
        this.paymentClient = paymentClient;
        this.rabbitTemplate = rabbitTemplate;
        this.transactionHelper = transactionHelper;
    }

    /**
     * Saga orchestrator - intentionally NOT @Transactional as it calls external services.
     * Each step uses OrderTransactionHelper for proper transaction boundaries
     * (needed because Spring AOP doesn't intercept self-invocation).
     */
    public OrderDto checkout(String tenantId, UUID buyerId, CheckoutRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one item is required");
        }

        // Step 1: create pending order and items (own transaction via helper)
        Order order = transactionHelper.createPendingOrder(tenantId, buyerId, request);

        // Step 2: request payment authorization (external call - no transaction)
        PaymentAuthorizationRequest paymentRequest = new PaymentAuthorizationRequest();
        paymentRequest.setOrderId(order.getId());
        paymentRequest.setUserId(buyerId);
        paymentRequest.setAmount(order.getTotalAmount());

        PaymentResponse paymentResponse;
        try {
            paymentResponse = paymentClient.authorize(tenantId, paymentRequest);
        } catch (Exception ex) {
            // Mark order as canceled due to payment failure
            transactionHelper.markOrderCanceled(tenantId, order.getId());
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "Payment authorization failed");
        }

        if (!"AUTHORIZED".equalsIgnoreCase(paymentResponse.getStatus())) {
            transactionHelper.markOrderCanceled(tenantId, order.getId());
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "Payment not authorized");
        }

        // Step 3: decrement stock within transaction, compensate payment on failure
        try {
            transactionHelper.confirmOrderAndDecrementStock(tenantId, order.getId());
        } catch (RuntimeException ex) {
            paymentClient.cancel(tenantId, order.getId().toString());
            transactionHelper.markOrderCanceled(tenantId, order.getId());
            throw ex;
        }

        Order confirmed = orderRepository.findByIdAndTenantId(order.getId(), tenantId)
                .orElseThrow(() -> new IllegalStateException("Order disappeared during Saga"));

        // Step 4: publish order.confirmed event
        OrderConfirmedEvent event = new OrderConfirmedEvent(
                confirmed.getId(),
                confirmed.getBuyerId(),
                tenantId,
                confirmed.getTotalAmount(),
                Instant.now());
        rabbitTemplate.convertAndSend("university.events", "market.order.confirmed", event);

        return toDto(confirmed);
    }

    /**
     * Get user's order history
     */
    @Transactional(readOnly = true)
    public List<OrderDto> getUserOrders(String tenantId, UUID buyerId) {
        return orderRepository.findAllByTenantIdAndBuyerIdOrderByCreatedAtDesc(tenantId, buyerId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific order
     */
    @Transactional(readOnly = true)
    public OrderDto getOrder(String tenantId, UUID orderId, UUID buyerId) {
        Order order = orderRepository.findByIdAndTenantId(orderId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        
        // Ensure user can only see their own orders
        if (!order.getBuyerId().equals(buyerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        
        return toDto(order);
    }

    /**
     * FIX #3: Updated to include createdAt in the DTO
     */
    public OrderDto toDto(Order order) {
        List<OrderItemDto> itemDtos = order.getItems().stream()
                .map(i -> new OrderItemDto(
                        i.getProduct().getId(),
                        i.getProduct().getName(),
                        i.getQuantity(),
                        i.getPrice()))
                .collect(Collectors.toList());

        // FIX #3: Now passing createdAt to constructor
        return new OrderDto(
                order.getId(), 
                order.getTotalAmount(), 
                order.getStatus(), 
                itemDtos,
                order.getCreatedAt()  // FIX #3: Added createdAt
        );
    }
}
