package io.rahulnanhore.orgintel.storage;

import io.rahulnanhore.orgintel.common.exception.ApiException;
import io.rahulnanhore.orgintel.storage.impl.LocalStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class LocalStorageServiceTest {

    @TempDir
    Path tempDir;

    private LocalStorageService storageService;

    @BeforeEach
    void setUp() {
        storageService = new LocalStorageService(tempDir.toString());
    }

    @Test
    void shouldSaveAndLoadFileSuccessfully() throws IOException {
        String key = "org_123/doc_456/v1_sample.txt";
        String content = "Hello OrgIntel enterprise storage!";
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);

        storageService.save(key, new ByteArrayInputStream(bytes), bytes.length, "text/plain");

        assertTrue(storageService.exists(key));

        try (InputStream in = storageService.load(key)) {
            String readContent = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            assertEquals(content, readContent);
        }

        storageService.delete(key);
        assertFalse(storageService.exists(key));
    }

    @Test
    void shouldRejectPathTraversalAttacks() {
        String maliciousKey = "../../../windows/system32/cmd.exe";
        byte[] bytes = "malicious".getBytes(StandardCharsets.UTF_8);

        ApiException ex = assertThrows(ApiException.class, () ->
                storageService.save(maliciousKey, new ByteArrayInputStream(bytes), bytes.length, "application/octet-stream")
        );
        assertEquals("PATH_TRAVERSAL_DETECTED", ex.getErrorCode());
    }
}
