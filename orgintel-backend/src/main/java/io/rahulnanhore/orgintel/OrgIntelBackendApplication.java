package io.rahulnanhore.orgintel;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class OrgIntelBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(OrgIntelBackendApplication.class, args);
	}

}
