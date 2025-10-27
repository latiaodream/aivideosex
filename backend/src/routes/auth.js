const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { 
  getClientIp, 
  generateIpHash, 
  generateAccount, 
  parseDevice, 
  getCountryCode 
} = require('../utils/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * components:
 *   schemas:
 *     AutoRegisterResponse:
 *       type: object
 *       properties:
 *         userId:
 *           type: integer
 *           description: User ID
 *         account:
 *           type: string
 *           description: Generated account name
 *         accountType:
 *           type: string
 *           description: Account type
 *           example: "ip-auto"
 */

/**
 * @swagger
 * /api/public/auth/auto:
 *   post:
 *     summary: Auto-register user based on IP
 *     tags: [Authentication]
 *     description: Automatically creates or returns existing user based on IP address
 *     responses:
 *       200:
 *         description: User created or retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AutoRegisterResponse'
 *         headers:
 *           Set-Cookie:
 *             description: Session cookie (aid)
 *             schema:
 *               type: string
 *       500:
 *         description: Internal server error
 */
router.post('/auto', async (req, res) => {
  try {
    const ip = getClientIp(req);
    const ipHash = generateIpHash(ip);
    const userAgent = req.headers['user-agent'] || '';
    
    // Check if user has existing session
    const existingSessionId = req.cookies.aid;
    if (existingSessionId) {
      try {
        const userId = parseInt(existingSessionId);
        const existingUser = await prisma.user.findUnique({
          where: { id: userId }
        });
        
        if (existingUser) {
          // Update last login info
          await prisma.user.update({
            where: { id: userId },
            data: {
              lastLoginAt: new Date(),
              lastLoginIp: ip
            }
          });
          
          return res.json({
            userId: existingUser.id,
            account: existingUser.account,
            accountType: 'ip-auto'
          });
        }
      } catch (error) {
        // Invalid session ID, continue to create new user
        console.log('Invalid session ID, creating new user');
      }
    }
    
    // Generate unique account
    const account = await generateAccount(ipHash, prisma);
    const device = parseDevice(userAgent);
    const countryCode = getCountryCode(ip);
    
    // Create new user
    const user = await prisma.user.create({
      data: {
        account,
        ipHash,
        registerIp: ip,
        registerDevice: device,
        countryCode,
        registeredAt: new Date(),
        lastLoginAt: new Date(),
        lastLoginIp: ip
      }
    });
    
    // Set session cookie
    res.cookie('aid', user.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax'
    });
    
    res.json({
      userId: user.id,
      account: user.account,
      accountType: 'ip-auto'
    });
    
  } catch (error) {
    console.error('Auto registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

module.exports = router;