//Prevent CSRF attacks, use where we are reading cookies using req.cookies
export function verifyOrigin(req, res, next) {
    const allowedOrigin = process.env.CLIENT_URL;

    const origin = req.headers.origin;
    const referer = req.headers.referer;

    // Allow server-to-server or non-browser requests
    if (!origin && !referer) {
        return next();
    }

    // Validate origin or referer
    if (
        (origin && origin === allowedOrigin) ||
        (referer && referer.startsWith(allowedOrigin))
    ) {
        return next();
    }

    return res.status(403).json({ error: 'Invalid origin' });
}