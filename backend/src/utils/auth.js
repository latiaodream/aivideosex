const crypto = require('crypto');
const dayjs = require('dayjs');
const useragent = require('useragent');

/**
 * Get client IP address from request
 */
function getClientIp(req) {
  const isProd = process.env.NODE_ENV === 'production';

  // 1) Trusted proxy headers (first IP wins)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    if (ip) return ip;
  }

  // 2) Common proxy header
  const realIp = req.headers['x-real-ip'];
  if (realIp) return realIp;

  // 3) Dev-only overrides to help local testing (safe: ignored in production)
  if (!isProd) {
    const overrideHeader = req.headers['x-client-ip'] || req.headers['x-dev-client-ip'];
    const overrideQuery = req.query?.ip_override || req.body?.ip_override;

    const candidate = overrideHeader || overrideQuery;
    if (candidate && isValidIp(candidate)) {
      return candidate;
    }
  }

  // 4) Fallback to socket address
  return req.socket.remoteAddress || '127.0.0.1';
}

function isValidIp(ip) {
  if (!ip || typeof ip !== 'string') return false;
  // very simple IPv4/IPv6 checks (good enough for dev override)
  const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  const ipv6 = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/;
  return ipv4.test(ip) || ipv6.test(ip);
}

/**
 * Generate IP hash
 */
function generateIpHash(ip) {
  const salt = process.env.IP_SALT || 'default_salt';
  return crypto
    .createHash('sha256')
    .update(ip + salt)
    .digest('hex')
    .slice(0, 10);
}

/**
 * Generate unique account name
 */
async function generateAccount(ipHash, prisma) {
  const today = dayjs().format('YYMMDD');
  const base = `u_${ipHash}_${today}`;
  
  let account = base;
  let n = 2;
  
  // Check if account exists and increment if needed
  while (await prisma.user.findUnique({ where: { account } })) {
    account = `${base}-${n++}`;
  }
  
  return account;
}

/**
 * Parse device from User-Agent
 */
function parseDevice(userAgent) {
  if (!userAgent) return 'Unknown';
  
  const agent = useragent.parse(userAgent);
  
  // Check for mobile
  if (userAgent.toLowerCase().includes('mobile')) {
    if (userAgent.toLowerCase().includes('iphone') || 
        userAgent.toLowerCase().includes('ios')) {
      return 'iOS';
    }
    if (userAgent.toLowerCase().includes('android')) {
      return 'Android';
    }
    return 'Mobile';
  }
  
  // Default to Web for desktop browsers
  return 'Web';
}

/**
 * Get country code from IP (simplified, in real world use GeoIP service)
 */
function getCountryCode(ip) {
  // This is a simplified implementation
  // In production, use a GeoIP service like MaxMind
  if (ip.startsWith('192.168.') || ip.startsWith('127.0.')) {
    return 'LOCAL';
  }
  
  // For demo purposes, return some sample country codes
  const hash = crypto.createHash('md5').update(ip).digest('hex');
  const countries = ['US', 'CN', 'JP', 'KR', 'MX', 'BR', 'DE', 'FR', 'UK', 'CA'];
  return countries[parseInt(hash.slice(0, 1), 16) % countries.length];
}

/**
 * Admin authentication middleware
 */
function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid admin token required'
    });
  }
  
  next();
}

module.exports = {
  getClientIp,
  generateIpHash,
  generateAccount,
  parseDevice,
  getCountryCode,
  requireAdmin
};