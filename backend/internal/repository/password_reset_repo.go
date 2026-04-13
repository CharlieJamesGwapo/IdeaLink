package repository

import (
	"database/sql"
	"errors"
	"time"
)

// ErrResetTokenNotFound indicates no valid (unexpired, unused) token matches.
var ErrResetTokenNotFound = errors.New("reset token not found or expired")

type PasswordResetRepo struct {
	db *sql.DB
}

func NewPasswordResetRepo(db *sql.DB) *PasswordResetRepo {
	return &PasswordResetRepo{db: db}
}

func (r *PasswordResetRepo) Create(userID int, tokenHash string, expiresAt time.Time) error {
	_, err := r.db.Exec(
		`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, tokenHash, expiresAt,
	)
	return err
}

// FindValidByHash returns (userID, rowID) for a token that is unused and not expired.
func (r *PasswordResetRepo) FindValidByHash(tokenHash string) (int, int, error) {
	var userID, id int
	err := r.db.QueryRow(
		`SELECT id, user_id FROM password_reset_tokens
		 WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
		tokenHash,
	).Scan(&id, &userID)
	if err == sql.ErrNoRows {
		return 0, 0, ErrResetTokenNotFound
	}
	if err != nil {
		return 0, 0, err
	}
	return userID, id, nil
}

func (r *PasswordResetRepo) MarkUsed(id int) error {
	_, err := r.db.Exec(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, id)
	return err
}
