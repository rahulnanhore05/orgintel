package io.rahulnanhore.orgintel.conversation.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

import io.rahulnanhore.orgintel.identity.domain.User;

@Entity
@Table(name = "answer_feedback", uniqueConstraints = {
    @UniqueConstraint(name = "uk_feedback_message_user", columnNames = {"message_id", "user_id"})
})
public class AnswerFeedback {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "rating", nullable = false)
    private int rating;

    @Column(name = "is_incorrect")
    private boolean incorrect;

    @Column(name = "is_unsupported")
    private boolean unsupported;

    @Column(name = "feedback_text", columnDefinition = "TEXT")
    private String feedbackText;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AnswerFeedback() {
    }

    public AnswerFeedback(UUID id, Message message, User user, int rating, boolean incorrect, boolean unsupported, String feedbackText) {
        this.id = id != null ? id : UUID.randomUUID();
        this.message = message;
        this.user = user;
        this.rating = rating;
        this.incorrect = incorrect;
        this.unsupported = unsupported;
        this.feedbackText = feedbackText;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Message getMessage() {
        return message;
    }

    public User getUser() {
        return user;
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public boolean isIncorrect() {
        return incorrect;
    }

    public void setIncorrect(boolean incorrect) {
        this.incorrect = incorrect;
    }

    public boolean isUnsupported() {
        return unsupported;
    }

    public void setUnsupported(boolean unsupported) {
        this.unsupported = unsupported;
    }

    public String getFeedbackText() {
        return feedbackText;
    }

    public void setFeedbackText(String feedbackText) {
        this.feedbackText = feedbackText;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
