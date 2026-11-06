package io.rahulnanhore.orgintel.storage;

import java.io.InputStream;

public interface StorageService {
    void save(String key, InputStream inputStream, long size, String contentType);
    InputStream load(String key);
    void delete(String key);
    boolean exists(String key);
}
