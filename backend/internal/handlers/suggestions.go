package handlers

import (
	"errors"
	"io"
	"net/http"
	"strconv"

	"idealink/internal/middleware"
	"idealink/internal/models"
	"idealink/internal/repository"
	"idealink/internal/services"

	"github.com/gin-gonic/gin"
)

// Attachment limits. Enforced server-side even though the client also checks.
const (
	maxAttachmentsPerSuggestion = 3
	maxAttachmentBytes          = 5 * 1024 * 1024 // 5 MB
)

// Allowed MIME types for feedback attachments. Keep narrow — these get served
// back to staff, so we don't want executables or oddball formats.
var allowedAttachmentMimes = map[string]bool{
	"image/jpeg":      true,
	"image/png":       true,
	"image/gif":       true,
	"image/webp":      true,
	"application/pdf": true,
}

type SuggestionHandler struct {
	svc             *services.SuggestionService
	attachmentRepo  repository.SuggestionAttachmentRepository
}

func NewSuggestionHandler(svc *services.SuggestionService, attachmentRepo repository.SuggestionAttachmentRepository) *SuggestionHandler {
	return &SuggestionHandler{svc: svc, attachmentRepo: attachmentRepo}
}

func (h *SuggestionHandler) Submit(c *gin.Context) {
	userIDVal, _ := c.Get(middleware.CtxKeyUserID)
	userID, _ := userIDVal.(int)
	var input models.CreateSuggestionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	suggestion, err := h.svc.Submit(userID, input)
	if err != nil {
		if errors.Is(err, services.ErrWeeklyLimitReached) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "You've reached the 5-submission weekly limit. The counter resets every Monday.",
				"code":  "WEEKLY_LIMIT_REACHED",
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, suggestion)
}

// GET /api/submissions/weekly-usage — user-only. Returns usage for the submit
// UI's "X of 5 this week" counter.
func (h *SuggestionHandler) WeeklyUsage(c *gin.Context) {
	userIDVal, _ := c.Get(middleware.CtxKeyUserID)
	userID, _ := userIDVal.(int)
	usage, err := h.svc.WeeklyUsageFor(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, usage)
}

func (h *SuggestionHandler) List(c *gin.Context) {
	userIDVal, _ := c.Get(middleware.CtxKeyUserID)
	userID, _ := userIDVal.(int)
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	role, _ := roleVal.(string)
	list, err := h.svc.ListForRole(userID, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if list == nil {
		list = []*models.Suggestion{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *SuggestionHandler) UpdateStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	role, _ := roleVal.(string)
	// Admin is read-only per the simplified status flow — only Registrar and
	// Finance (accounting) staff may toggle Reviewed / Unreviewed (Delivered).
	if role == services.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin cannot change feedback status"})
		return
	}
	var input models.UpdateStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.UpdateStatus(id, input.Status); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "status updated"})
}

// POST /api/suggestions/:id/read — staff-only. Auto-marks as Reviewed when
// Registrar / Finance opens the feedback detail.
func (h *SuggestionHandler) MarkReviewed(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	role, _ := roleVal.(string)
	// Admin is read-only — opening a feedback doesn't change its status.
	if role == services.RoleAdmin {
		c.Status(http.StatusNoContent)
		return
	}
	if err := h.svc.MarkReviewedOnOpen(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// GET /api/submissions/status-unread-count — user-only. Returns how many of
// the caller's own submissions have had an unacknowledged status change.
func (h *SuggestionHandler) StatusUnreadCount(c *gin.Context) {
	userIDVal, _ := c.Get(middleware.CtxKeyUserID)
	userID, _ := userIDVal.(int)
	n, err := h.svc.CountStatusUnreadByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": n})
}

// POST /api/submissions/mark-seen — user-only. Clears the unread badge.
func (h *SuggestionHandler) MarkSubmissionsSeen(c *gin.Context) {
	userIDVal, _ := c.Get(middleware.CtxKeyUserID)
	userID, _ := userIDVal.(int)
	if err := h.svc.MarkStatusSeenByUser(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// DELETE /api/suggestions/:id — admin + registrar + finance. Soft-deletes the
// suggestion. Staff are scoped to their own department; admin can delete any.
func (h *SuggestionHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	role, _ := roleVal.(string)
	// Staff can only delete feedback addressed to their own office. Admin can
	// delete anything.
	if role == services.RoleRegistrar || role == services.RoleAccounting {
		target, err := h.svc.FindByID(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if target == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		wantDept := "Registrar Office"
		if role == services.RoleAccounting {
			wantDept = "Finance Office"
		}
		if target.Department != wantDept {
			c.JSON(http.StatusForbidden, gin.H{"error": "cannot delete another office's feedback"})
			return
		}
	}
	if err := h.svc.SoftDelete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// POST /api/suggestions/:id/attachments — submitter or staff of the matching
// office may attach. Multipart field "file". Max 3 files per suggestion,
// 5 MB each, image/jpeg|png|gif|webp or application/pdf only.
func (h *SuggestionHandler) UploadAttachment(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if ok, status, msg := h.canViewSuggestion(c, id); !ok {
		c.JSON(status, gin.H{"error": msg})
		return
	}

	// Enforce per-suggestion cap.
	count, err := h.attachmentRepo.CountBySuggestion(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if count >= maxAttachmentsPerSuggestion {
		c.JSON(http.StatusBadRequest, gin.H{"error": "attachment limit reached (max 3)"})
		return
	}

	fh, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file field is required"})
		return
	}
	if fh.Size > maxAttachmentBytes {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "file exceeds 5 MB limit"})
		return
	}
	mimeType := fh.Header.Get("Content-Type")
	if !allowedAttachmentMimes[mimeType] {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": "only JPEG, PNG, GIF, WebP, or PDF allowed"})
		return
	}

	f, err := fh.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	defer f.Close()
	// Cap read explicitly in case Content-Length was spoofed.
	data, err := io.ReadAll(io.LimitReader(f, maxAttachmentBytes+1))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if len(data) > maxAttachmentBytes {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "file exceeds 5 MB limit"})
		return
	}

	att, err := h.attachmentRepo.Create(id, fh.Filename, mimeType, data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, att)
}

// GET /api/suggestions/:id/attachments — role-scoped list.
func (h *SuggestionHandler) ListAttachments(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if ok, status, msg := h.canViewSuggestion(c, id); !ok {
		c.JSON(status, gin.H{"error": msg})
		return
	}
	list, err := h.attachmentRepo.ListBySuggestion(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

// GET /api/suggestions/:id/attachments/:aid — binary download, role-scoped.
func (h *SuggestionHandler) DownloadAttachment(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	aid, err := strconv.Atoi(c.Param("aid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid attachment id"})
		return
	}
	if ok, status, msg := h.canViewSuggestion(c, id); !ok {
		c.JSON(status, gin.H{"error": msg})
		return
	}
	att, data, err := h.attachmentRepo.FindBlob(aid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if att == nil || att.SuggestionID != id {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.Header("Content-Disposition", `inline; filename="`+att.Filename+`"`)
	c.Data(http.StatusOK, att.MimeType, data)
}

// canViewSuggestion returns (ok, status, msg). Owner, admin, or staff of the
// matching office may view a suggestion's attachments.
func (h *SuggestionHandler) canViewSuggestion(c *gin.Context, suggestionID int) (bool, int, string) {
	userIDVal, _ := c.Get(middleware.CtxKeyUserID)
	userID, _ := userIDVal.(int)
	roleVal, _ := c.Get(middleware.CtxKeyRole)
	role, _ := roleVal.(string)

	suggestion, err := h.svc.FindByID(suggestionID)
	if err != nil {
		return false, http.StatusInternalServerError, err.Error()
	}
	if suggestion == nil {
		return false, http.StatusNotFound, "not found"
	}
	switch role {
	case services.RoleAdmin:
		return true, 0, ""
	case services.RoleRegistrar:
		if suggestion.Department == "Registrar Office" {
			return true, 0, ""
		}
	case services.RoleAccounting:
		if suggestion.Department == "Finance Office" {
			return true, 0, ""
		}
	case services.RoleUser:
		if suggestion.UserID == userID {
			return true, 0, ""
		}
	}
	return false, http.StatusForbidden, "not allowed"
}

func (h *SuggestionHandler) Feature(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	testimonial, err := h.svc.Feature(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, testimonial)
}
