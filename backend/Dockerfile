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

# curl is here for the container health check, which both Compose and the ECS
# task definition rely on to know when Spring has finished starting.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 10001 --create-home appuser

COPY --from=build --chown=appuser:appuser /build/build/libs/*.jar app.jar
USER appuser

EXPOSE 8080

# These are sized against the 768 MiB the ECS task definition gives this container,
# and were arrived at by running loadtest/ at 100 concurrent players until it stopped
# being OOM-killed. Changing the task's memory means revisiting them.
#
# MaxRAMPercentage caps the *heap* as a share of the cgroup limit, and the rest of
# the process has to fit in what is left. At the 70 it used to be, 537 MiB of heap
# plus 128 of metaspace plus the code cache plus a thread stack for each of the ~200
# Tomcat threads came to more than the container had, and the kernel killed it —
# reproducibly, about forty seconds into a second run at 100 concurrent players. The
# heap was never the problem: a full GC at that point showed roughly 30 MiB live.
#
# G1 rather than Serial because Serial is a single-threaded stop-the-world collector
# and its pauses were the latency tail — 460 ms at worst, against a p50 of 13 ms.
#
# Xss512k halves the stack of every one of those threads.
#
# MALLOC_ARENA_MAX bounds glibc's per-thread arenas, which otherwise hold on to a few
# hundred MiB of freed memory that the JVM does not account for and the container
# still has to pay for.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=45 -XX:+UseG1GC -XX:MaxMetaspaceSize=128m -Xss512k"
ENV MALLOC_ARENA_MAX=2

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
