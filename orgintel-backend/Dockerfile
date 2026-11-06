# Multi-stage Dockerfile for OrgIntel Backend
# Stage 1: Build JAR using Maven and Java 21
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /build

# Copy Maven wrapper and pom.xml first to leverage Docker layer caching
COPY pom.xml .
COPY .mvn/ .mvn/
COPY mvnw mvnw

# Download dependencies offline
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B || true

# Copy source code and build production jar (skipping tests since tests run in CI/CD pipeline)
COPY src/ src/
RUN ./mvnw clean package -DskipTests -B

# Stage 2: Minimal, secure runtime container
FROM eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app

# Install curl for container health check
RUN apk add --no-cache curl

# Create non-root system group and user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create storage directory with appropriate permissions
RUN mkdir -p /app/storage && chown -R appuser:appgroup /app

# Copy executable jar from builder stage
COPY --from=builder --chown=appuser:appgroup /build/target/*.jar app.jar

# Switch to non-root user
USER appuser

EXPOSE 8080

# Container healthcheck using Spring Boot Actuator
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
