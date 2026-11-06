package io.rahulnanhore.orgintel.storage.impl;

import io.rahulnanhore.orgintel.common.exception.ApiException;
import io.rahulnanhore.orgintel.common.exception.ResourceNotFoundException;
import io.rahulnanhore.orgintel.storage.StorageService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
public class LocalStorageService implements StorageService {

    private final Path basePath;

    public LocalStorageService(@Value("${orgintel.storage.local-path:./storage/uploads}") String localPath) {
        this.basePath = Paths.get(localPath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.basePath);
        } catch (IOException e) {
            throw new ApiException("Failed to initialize storage directory: " + this.basePath,
                    HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_INIT_ERROR", e);
        }
    }

    @Override
    public void save(String key, InputStream inputStream, long size, String contentType) {
        Path targetPath = resolveAndVerifyPath(key);
        try {
            if (targetPath.getParent() != null) {
                Files.createDirectories(targetPath.getParent());
            }
            Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ApiException("Failed to store file with key: " + key,
                    HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_WRITE_ERROR", e);
        }
    }

    @Override
    public InputStream load(String key) {
        Path targetPath = resolveAndVerifyPath(key);
        if (!Files.exists(targetPath) || !Files.isReadable(targetPath)) {
            throw new ResourceNotFoundException("Stored object not found: " + key);
        }
        try {
            return Files.newInputStream(targetPath);
        } catch (IOException e) {
            throw new ApiException("Failed to read file with key: " + key,
                    HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_READ_ERROR", e);
        }
    }

    @Override
    public void delete(String key) {
        Path targetPath = resolveAndVerifyPath(key);
        try {
            Files.deleteIfExists(targetPath);
        } catch (IOException e) {
            throw new ApiException("Failed to delete file with key: " + key,
                    HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_DELETE_ERROR", e);
        }
    }

    @Override
    public boolean exists(String key) {
        Path targetPath = resolveAndVerifyPath(key);
        return Files.exists(targetPath);
    }

    private Path resolveAndVerifyPath(String key) {
        if (key == null || key.isBlank()) {
            throw new ApiException("Storage key must not be empty", HttpStatus.BAD_REQUEST, "INVALID_STORAGE_KEY");
        }
        Path resolved = basePath.resolve(key).normalize();
        if (!resolved.startsWith(basePath)) {
            throw new ApiException("Path traversal attempt detected with key: " + key,
                    HttpStatus.BAD_REQUEST, "PATH_TRAVERSAL_DETECTED");
        }
        return resolved;
    }
}
