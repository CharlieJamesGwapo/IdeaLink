<?php
/**
 * Set or get a flash message.
 * Set: flash('success', 'Done!');
 * Get: $msg = flash('success');
 */
function flash(string $key, string $message = '', string $type = 'success'): ?array {
    if ($message !== '') {
        $_SESSION['flash'][$key] = ['message' => $message, 'type' => $type];
        return null;
    }
    if (isset($_SESSION['flash'][$key])) {
        $flash = $_SESSION['flash'][$key];
        unset($_SESSION['flash'][$key]);
        return $flash;
    }
    return null;
}

/**
 * Redirect and exit.
 */
function redirect(string $url): void {
    header("Location: $url");
    exit;
}

/**
 * Check if a session variable is set.
 */
function isLoggedIn(string $sessionKey): bool {
    return isset($_SESSION[$sessionKey]);
}

/**
 * Sanitize output for HTML display.
 */
function e(string $str): string {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

/**
 * Human-readable time difference.
 */
function timeAgo(string $datetime): string {
    $now = new DateTime();
    $past = new DateTime($datetime);
    $diff = $now->diff($past);

    if ($diff->y > 0) return $diff->y . ' year' . ($diff->y > 1 ? 's' : '') . ' ago';
    if ($diff->m > 0) return $diff->m . ' month' . ($diff->m > 1 ? 's' : '') . ' ago';
    if ($diff->d > 0) return $diff->d . ' day' . ($diff->d > 1 ? 's' : '') . ' ago';
    if ($diff->h > 0) return $diff->h . ' hour' . ($diff->h > 1 ? 's' : '') . ' ago';
    if ($diff->i > 0) return $diff->i . ' min' . ($diff->i > 1 ? 's' : '') . ' ago';
    return 'Just now';
}
?>
