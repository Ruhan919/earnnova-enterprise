<?php
// Serve static files directly
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// If the file exists, serve it
if ($uri !== '/' && file_exists(__DIR__ . $uri)) {
    return false;
}

// Route / to /app/login.html
if ($uri === '/' || $uri === '') {
    header('Location: /app/login.html');
    exit;
}

// Try app/ subdirectory
if (file_exists(__DIR__ . '/app' . $uri)) {
    return false;
}

// 404
http_response_code(404);
echo '404 Not Found';
