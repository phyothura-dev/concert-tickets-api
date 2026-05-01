# Logs Test Report Example (Validation)
  [13:42:07.409] INFO: Request Received
    correlationId: "825240a5-8a71-4659-9321-a47376712ad0"
    method: "POST"
    path: "/reserve"
    ip: "::ffff:172.21.0.1"

  [13:42:07.421] WARN: RATE_LIMIT_FALLBACK=memory; using in-memory rate limiter store (NOT for production)
    correlationId: "825240a5-8a71-4659-9321-a47376712ad0"

  [13:42:07.435] ERROR: Validation Error
    correlationId: "825240a5-8a71-4659-9321-a47376712ad0"
    statusCode: 400
    code: "VALIDATION_ERROR"
    message: "concertId must be a valid UUID"
    details:
      - path: "concertId"
        message: "concertId must be a valid UUID"
        code: "invalid_format"

  [13:42:07.443] INFO: Request Completed
    correlationId: "825240a5-8a71-4659-9321-a47376712ad0"
    method: "POST"
    path: "/reserve"
    statusCode: 400
    durationMs: 34.68




