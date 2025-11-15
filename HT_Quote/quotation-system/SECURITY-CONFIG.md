# 🔒 Security Configuration Guide

## API Key Setup

### Backend Configuration
Add to your `.env` file:
```env
# API Key for frontend authentication
API_KEY=your-secret-api-key-here
```

### Frontend Configuration
Add to your `.env.local` file:
```env
# API Key for backend authentication
NEXT_PUBLIC_API_KEY=your-secret-api-key-here
```

### Generate Secure API Key
Run this command to generate a secure API key:
```bash
php artisan key:generate --show
```

Use the generated key for both `API_KEY` and `NEXT_PUBLIC_API_KEY`.

## Security Features Implemented

### 1. API Key Authentication
- All frontend endpoints now require valid API key
- Key must be sent in `X-API-Key` header
- Returns 401 Unauthorized for invalid/missing keys

### 2. Rate Limiting
- 60 requests per minute per IP address
- Returns 429 Too Many Requests when exceeded
- Prevents abuse and DDoS attacks

### 3. Request Logging
- All API requests are logged with:
  - Method, URL, IP address
  - User agent, headers
  - Response status, duration
  - Timestamp for audit trail

### 4. Input Validation
- All requests go through Laravel's built-in validation
- Prevents injection attacks
- Sanitizes input data

## Security Status

### ✅ Protected Endpoints
- Products API (GET, POST, PUT, DELETE)
- Customers API (GET, POST, PUT, DELETE)
- Customer Contacts API (GET, POST, PUT, DELETE)
- Service Tasks API (GET, POST, PUT, DELETE)
- Product Suggestions API (GET, POST, PUT, DELETE)
- Product Cost Prices API (GET, POST, PUT, DELETE)
- AMC Descriptions API (GET)

### 🔒 Still Protected (Admin Only)
- Quotations API
- Users API
- Settings API
- Reports API
- Support Contracts API

## Testing Security

### Test API Key Protection
```bash
# Without API key (should fail)
curl -X GET http://127.0.0.1:8000/api/products

# With API key (should work)
curl -X GET http://127.0.0.1:8000/api/products -H "X-API-Key: your-secret-api-key-here"
```

### Test Rate Limiting
```bash
# Make 61 requests quickly (should fail after 60)
for i in {1..61}; do curl -X GET http://127.0.0.1:8000/api/products -H "X-API-Key: your-secret-api-key-here"; done
```

## Security Monitoring

### Log Files
- Check `storage/logs/laravel.log` for API request logs
- Monitor for suspicious activity
- Set up log rotation for production

### Rate Limiting Monitoring
- Monitor 429 responses in logs
- Set up alerts for excessive rate limiting
- Consider IP whitelisting for trusted sources

## Production Recommendations

1. **Use Strong API Keys**: Generate cryptographically secure keys
2. **Environment Separation**: Different keys for dev/staging/production
3. **Regular Key Rotation**: Change API keys periodically
4. **HTTPS Only**: Use HTTPS in production
5. **Monitor Usage**: Track API key usage and access patterns
6. **Log Analysis**: Set up automated log analysis for security threats

## Troubleshooting

### API Key Not Working
1. Check `.env` file has `API_KEY=your-secret-api-key-here`
2. Check frontend `.env.local` has `NEXT_PUBLIC_API_KEY=your-secret-api-key-here`
3. Restart backend server after changing environment variables
4. Check browser network tab for `X-API-Key` header

### Rate Limiting Issues
1. Check if you're making too many requests
2. Wait 1 minute for rate limit to reset
3. Consider increasing rate limit for development
4. Check logs for rate limiting messages

### Logging Issues
1. Check `storage/logs/laravel.log` exists
2. Ensure `storage/logs` directory is writable
3. Check log level in `.env` file
4. Restart server after configuration changes
