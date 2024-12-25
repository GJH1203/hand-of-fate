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
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-data-mongodb")
	implementation("org.springframework.boot:spring-boot-starter-web")
	implementation("org.springframework.boot:spring-boot-starter-logging")

	// immutables
	annotationProcessor("org.immutables:value:2.10.1")
	compileOnly("org.immutables:value:2.10.1")

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
