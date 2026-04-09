// backend/internal/repository/compile_checks.go
package repository

// Compile-time assertions: these will fail if a concrete type no longer satisfies its interface.
var _ UserRepository         = (*UserRepo)(nil)
var _ SuggestionRepository   = (*SuggestionRepo)(nil)
var _ AnnouncementRepository = (*AnnouncementRepo)(nil)
var _ TestimonialRepository  = (*TestimonialRepo)(nil)
