// backend/internal/repository/email_log_repo.go
package repository

import (
	"database/sql"
	"time"
)

// Max characters stored in email_logs.error_msg. Keeps row size bounded
// even if an SMTP stack trace or unusually verbose error leaks through.
const maxErrorMsgLen = 1000

type EmailLog struct {
	ID        int64     `json:"id"`
	To        string    `json:"to"`
	Kind      string    `json:"kind"`
	Status    string    `json:"status"`
	ErrorMsg  *string   `json:"error_msg"`
	CreatedAt time.Time `json:"created_at"`
}

type EmailLogRepo struct {
	db *sql.DB
}

func NewEmailLogRepo(db *sql.DB) *EmailLogRepo {
	return &EmailLogRepo{db: db}
}

// Record writes a single attempt. errMsg should be empty when status='sent'.
// Callers use log-and-continue on errors from Record — auditing must never
// block the original send operation.
func (r *EmailLogRepo) Record(to, kind, status, errMsg string) error {
	if len(errMsg) > maxErrorMsgLen {
		errMsg = errMsg[:maxErrorMsgLen]
	}
	var nullableErr interface{}
	if errMsg != "" {
		nullableErr = errMsg
	}
	_, err := r.db.Exec(
		`INSERT INTO email_logs (to_address, kind, status, error_msg)
		 VALUES ($1, $2, $3, $4)`,
		to, kind, status, nullableErr,
	)
	return err
}

// List returns rows in reverse-chronological order. Filters are optional:
// pass empty string to skip the kind / status filter.
func (r *EmailLogRepo) List(kind, status string, limit, offset int) ([]*EmailLog, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := r.db.Query(
		`SELECT id, to_address, kind, status, error_msg, created_at
		 FROM email_logs
		 WHERE ($1 = '' OR kind = $1)
		   AND ($2 = '' OR status = $2)
		 ORDER BY created_at DESC
		 LIMIT $3 OFFSET $4`,
		kind, status, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*EmailLog, 0)
	for rows.Next() {
		var row EmailLog
		var errMsg sql.NullString
		if err := rows.Scan(&row.ID, &row.To, &row.Kind, &row.Status, &errMsg, &row.CreatedAt); err != nil {
			return nil, err
		}
		if errMsg.Valid {
			s := errMsg.String
			row.ErrorMsg = &s
		}
		out = append(out, &row)
	}
	return out, rows.Err()
}
