# Build stage — uses the Gradle wrapper so the build matches local exactly.
FROM eclipse-temurin:17-jdk AS build
WORKDIR /build

# Copy the wrapper and build scripts first so dependency resolution caches
# independently of source changes.
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon || true

COPY src src
RUN ./gradlew bootJar --no-daemon -x test

# Runtime stage
FROM eclipse-temurin:17-jre
WORKDIR /app

RUN useradd --system --uid 10001 --create-home appuser
COPY --from=build --chown=appuser:appuser /build/build/libs/*.jar app.jar
USER appuser

EXPOSE 8080

# MaxRAMPercentage makes the JVM read the container's cgroup limit instead of
# the host's 2 GiB, which is what keeps this from OOM-killing the box.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -XX:MaxMetaspaceSize=128m"

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
