<?php
/**
 * ONE-TIME SCRIPT: Hash all existing plain-text passwords.
 * Run once, then delete this file.
 *
 * Usage: php migrate_passwords.php
 * Or visit: http://localhost/IdeaLink/migrate_passwords.php
 */
require_once __DIR__ . '/includes/db_connect.php';

echo "<pre>\n";
echo "=== IdeaLink Password Migration ===\n\n";

$tables = [
    'user_accounts'      => 'password',
    'admin_accounts'     => 'password',
    'registrar_accounts' => 'password',
    'accounting_accounts'=> 'password',
];

foreach ($tables as $table => $col) {
    echo "Processing: $table\n";
    $res = $conn->query("SELECT id, $col FROM $table");
    $count = 0;

    while ($row = $res->fetch_assoc()) {
        $pwd = $row[$col];

        // Skip if already hashed (bcrypt hashes start with $2y$)
        if (str_starts_with($pwd, '$2y$')) {
            echo "  ID {$row['id']}: already hashed, skipping\n";
            continue;
        }

        $hashed = password_hash($pwd, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("UPDATE $table SET $col = ? WHERE id = ?");
        $stmt->bind_param("si", $hashed, $row['id']);
        $stmt->execute();
        $count++;
        echo "  ID {$row['id']}: hashed successfully\n";
    }

    echo "  -> $count passwords updated in $table\n\n";
}

echo "=== Migration Complete ===\n";
echo "DELETE THIS FILE NOW for security.\n";
echo "</pre>";
?>
