plugins {
	java
	id("org.springframework.boot") version "3.4.1"
	id("io.spring.dependency-management") version "1.1.7"
	id("org.flywaydb.flyway") version "9.14.1"
}

group = "com.cardgame"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(17)
	}
}

repositories {
	mavenCentral()
	maven { url = uri("https://jitpack.io") }  // Add this repository for Nakama SDK
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-data-mongodb")
	implementation("org.springframework.boot:spring-boot-starter-web")

	// Logging
	implementation("org.springframework.boot:spring-boot-starter-logging")

	// monitoring
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("io.micrometer:micrometer-registry-prometheus")

	// immutables
	annotationProcessor("org.immutables:value:2.10.1")
	compileOnly("org.immutables:value:2.10.1")

	// Nakama SDK
	implementation("com.github.heroiclabs.nakama-java:nakama-java:v2.5.3")  // Add this dependency
//	implementation("com.github.heroiclabs.nakama-java:nakama-java:v3.6.0")  // Add this dependency


	// utility
	implementation("com.google.guava:guava:32.1.2-jre")

	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()
}

flyway {
	url = "jdbc:postgresql://localhost:5432/demo_db"
	user = "postgres"
	password = "postgres"
	schemas = arrayOf("public")
}
