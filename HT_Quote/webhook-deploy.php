<?php
/**
 * GitHub Webhook for Automatic Deployment
 * Place this file in your web server's public directory
 */

// Configuration
$secret = 'your-webhook-secret-here';
$deploy_script = '/var/www/quotation-system/deploy-to-production.sh';
$log_file = '/var/log/quotation-deploy.log';

// Get the raw POST data
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';

// Verify the signature
$expected_signature = 'sha256=' . hash_hmac('sha256', $payload, $secret);

if (!hash_equals($expected_signature, $signature)) {
    http_response_code(401);
    die('Unauthorized');
}

// Parse the payload
$data = json_decode($payload, true);

// Only deploy on push to master branch
if ($data['ref'] === 'refs/heads/master') {
    $log_message = date('Y-m-d H:i:s') . " - Deploying commit: " . $data['head_commit']['id'] . "\n";
    file_put_contents($log_file, $log_message, FILE_APPEND | LOCK_EX);
    
    // Execute deployment script
    $output = shell_exec("$deploy_script 2>&1");
    file_put_contents($log_file, $output, FILE_APPEND | LOCK_EX);
    
    echo "Deployment triggered successfully";
} else {
    echo "No deployment needed for branch: " . $data['ref'];
}
?>
