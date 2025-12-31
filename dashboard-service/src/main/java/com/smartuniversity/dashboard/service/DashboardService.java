package com.smartuniversity.dashboard.service;

import com.smartuniversity.dashboard.domain.SensorReading;
import com.smartuniversity.dashboard.domain.SensorType;
import com.smartuniversity.dashboard.domain.ShuttleLocation;
import com.smartuniversity.dashboard.repository.SensorRepository;
import com.smartuniversity.dashboard.repository.ShuttleRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simulation of IoT sensor readings and shuttle locations backed by the dashboard database.
 */
@Service
public class DashboardService {

    private final SensorRepository sensorRepository;
    private final ShuttleRepository shuttleRepository;
    private final Random random = new Random();
    
    // Track route progress for each shuttle (0.0 to 1.0 representing position along the route)
    private final Map<UUID, Double> shuttleProgress = new ConcurrentHashMap<>();
    
    // Define campus shuttle route as waypoints (normalized 0-100 coordinates for the map)
    // Route: Library -> Science -> Student Center -> Engineering -> Library (loop)
    private static final double[][] ROUTE_WAYPOINTS = {
        {25, 25},   // Library (top-left)
        {85, 25},   // Science (top-right)  
        {85, 80},   // Student Center (bottom-right)
        {30, 80},   // Engineering (bottom-left)
        {25, 25}    // Back to Library (loop)
    };

    public DashboardService(SensorRepository sensorRepository, ShuttleRepository shuttleRepository) {
        this.sensorRepository = sensorRepository;
        this.shuttleRepository = shuttleRepository;
    }

    public List<SensorReading> getSensors(String tenantId) {
        List<SensorReading> sensors = sensorRepository.findAllByTenantId(tenantId);
        if (sensors.isEmpty()) {
            sensors = sensorRepository.saveAll(createDefaultSensors(tenantId));
        }
        return sensors;
    }

    public List<ShuttleLocation> getShuttles(String tenantId) {
        List<ShuttleLocation> shuttles = shuttleRepository.findAllByTenantId(tenantId);
        if (shuttles.isEmpty()) {
            shuttles = shuttleRepository.saveAll(createDefaultShuttles(tenantId));
        }
        return shuttles;
    }

    private List<SensorReading> createDefaultSensors(String tenantId) {
        Instant now = Instant.now();
        List<SensorReading> sensors = new ArrayList<>();
        sensors.add(new SensorReading(null, tenantId, SensorType.TEMPERATURE, "Lecture Hall Temp", 22.0, "°C", now));
        sensors.add(new SensorReading(null, tenantId, SensorType.HUMIDITY, "Library Humidity", 45.0, "%", now));
        sensors.add(new SensorReading(null, tenantId, SensorType.CO2, "Lab CO2", 600.0, "ppm", now));
        sensors.add(new SensorReading(null, tenantId, SensorType.ENERGY_USAGE, "Campus Energy", 120.0, "kW", now));
        return sensors;
    }

    private List<ShuttleLocation> createDefaultShuttles(String tenantId) {
        Instant now = Instant.now();
        List<ShuttleLocation> shuttles = new ArrayList<>();
        // Base position roughly in the center of a generic campus
        shuttles.add(new ShuttleLocation(null, tenantId, "Campus Shuttle A", 52.5200, 13.4050, now));
        return shuttles;
    }

    /**
     * Scheduled task to simulate IoT sensor value changes.
     * 
     * NOTE: This intentionally updates ALL sensors across ALL tenants as part of
     * the IoT simulation. Each tenant's sensors are updated with random variations
     * to simulate real-world sensor behavior. This is the correct approach for
     * background simulation tasks that don't have a request-scoped tenant context.
     */
    @Scheduled(fixedRateString = "${dashboard.sensors.update-interval-ms:5000}")
    public void updateSensors() {
        Instant now = Instant.now();
        // Intentionally fetch all sensors across all tenants for simulation
        List<SensorReading> sensors = sensorRepository.findAll();
        for (SensorReading sensor : sensors) {
            double delta = (random.nextDouble() - 0.5) * 2.0; // -1.0 to +1.0
            double newValue = sensor.getValue() + delta;
            // Clamp ranges roughly per type
            switch (sensor.getType()) {
                case TEMPERATURE -> newValue = clamp(newValue, 18.0, 28.0);
                case HUMIDITY -> newValue = clamp(newValue, 30.0, 70.0);
                case CO2 -> newValue = clamp(newValue, 400.0, 1200.0);
                case ENERGY_USAGE -> newValue = clamp(newValue, 50.0, 300.0);
                default -> { }
            }
            sensor.setValue(newValue);
            sensor.setUpdatedAt(now);
        }
        if (!sensors.isEmpty()) {
            sensorRepository.saveAll(sensors);
        }
    }

    /**
     * Scheduled task to simulate shuttle GPS location updates.
     * The shuttle follows a defined route around campus, visiting key stops.
     * 
     * NOTE: Like updateSensors(), this intentionally updates ALL shuttles across
     * ALL tenants as part of the location tracking simulation.
     */
    @Scheduled(fixedRateString = "${dashboard.shuttle.update-interval-ms:2000}")
    public void updateShuttles() {
        Instant now = Instant.now();
        // Intentionally fetch all shuttles across all tenants for simulation
        List<ShuttleLocation> shuttles = shuttleRepository.findAll();
        for (ShuttleLocation shuttle : shuttles) {
            // Get or initialize shuttle progress along the route
            double progress = shuttleProgress.getOrDefault(shuttle.getId(), 0.0);
            
            // Move shuttle along the route (2% progress per update = ~50 updates for full loop)
            progress += 0.02;
            if (progress >= 1.0) {
                progress = 0.0; // Loop back to start
            }
            shuttleProgress.put(shuttle.getId(), progress);
            
            // Calculate position along the route
            double[] position = getPositionOnRoute(progress);
            
            // Convert normalized coordinates (0-100) to lat/lon
            // Using a base position and scaling to create realistic-looking coordinates
            double baseLat = 52.52;
            double baseLon = 13.40;
            double latRange = 0.004; // ~400m north-south
            double lonRange = 0.006; // ~400m east-west
            
            double newLat = baseLat + (position[1] / 100.0) * latRange;
            double newLon = baseLon + (position[0] / 100.0) * lonRange;
            
            shuttle.setLatitude(newLat);
            shuttle.setLongitude(newLon);
            shuttle.setUpdatedAt(now);
        }
        if (!shuttles.isEmpty()) {
            shuttleRepository.saveAll(shuttles);
        }
    }
    
    /**
     * Interpolate position along the route based on progress (0.0 to 1.0).
     * Returns [x, y] coordinates in the 0-100 range.
     */
    private double[] getPositionOnRoute(double progress) {
        int numSegments = ROUTE_WAYPOINTS.length - 1;
        double segmentLength = 1.0 / numSegments;
        
        // Find which segment we're on
        int segmentIndex = (int) (progress / segmentLength);
        if (segmentIndex >= numSegments) {
            segmentIndex = numSegments - 1;
        }
        
        // Calculate progress within this segment (0.0 to 1.0)
        double segmentProgress = (progress - (segmentIndex * segmentLength)) / segmentLength;
        
        // Interpolate between waypoints
        double[] start = ROUTE_WAYPOINTS[segmentIndex];
        double[] end = ROUTE_WAYPOINTS[segmentIndex + 1];
        
        double x = start[0] + (end[0] - start[0]) * segmentProgress;
        double y = start[1] + (end[1] - start[1]) * segmentProgress;
        
        return new double[]{x, y};
    }

    private double clamp(double value, double min, double max) {
        return Math.min(max, Math.max(min, value));
    }
}