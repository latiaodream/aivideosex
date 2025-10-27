const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/search/image:
 *   post:
 *     summary: Perform image search
 *     tags: [Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageData:
 *                 type: string
 *                 description: Base64 encoded image data
 *               userId:
 *                 type: integer
 *                 description: User ID (optional)
 *               planId:
 *                 type: integer
 *                 description: Plan ID for search quality
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 resultCount:
 *                   type: integer
 *                 searchId:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Search failed
 */
router.post('/image', async (req, res) => {
  try {
    const { imageData, userId, planId, options = {} } = req.body;

    if (!imageData) {
      return res.status(400).json({
        error: 'Missing image data',
        message: 'Image data is required for search'
      });
    }

    // Validate image data format
    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({
        error: 'Invalid image format',
        message: 'Image must be in base64 format with data URL prefix'
      });
    }

    // Get plan details if provided
    let plan = null;
    if (planId) {
      plan = await prisma.plan.findUnique({
        where: { id: parseInt(planId) }
      });
    }

    // Simulate AI image search with different success rates based on plan
    const searchQuality = plan ? getSearchQuality(plan.code) : 'basic';
    const searchResult = await performImageSearch(imageData, searchQuality, options);

    // Log search activity (optional)
    if (userId) {
      await logSearchActivity(userId, planId, searchResult);
    }

    res.json({
      success: searchResult.success,
      results: searchResult.results,
      resultCount: searchResult.resultCount,
      searchId: searchResult.searchId,
      message: searchResult.message,
      quality: searchQuality
    });

  } catch (error) {
    console.error('Image search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: 'An error occurred during image search'
    });
  }
});

// Helper function to determine search quality based on plan
function getSearchQuality(planCode) {
  const qualityMap = {
    'ADV': 'standard',    // 高级版 - 标准质量
    'SUP': 'high',        // 超级版 - 高质量  
    'ULT': 'premium',     // 终极版 - 优质
    'SUPR': 'ultimate'    // 至尊版 - 终极质量
  };
  return qualityMap[planCode] || 'basic';
}

// Simulate AI image search
async function performImageSearch(imageData, quality, options) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  // Different success rates based on quality
  const successRates = {
    'basic': 0.3,      // 30% success rate
    'standard': 0.5,   // 50% success rate  
    'high': 0.7,       // 70% success rate
    'premium': 0.85,   // 85% success rate
    'ultimate': 0.95   // 95% success rate
  };

  const successRate = successRates[quality] || 0.3;
  const isSuccess = Math.random() < successRate;

  const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  if (isSuccess) {
    // Generate mock results
    const resultCount = Math.floor(Math.random() * 50) + 10;
    const results = generateMockResults(resultCount, quality);

    return {
      success: true,
      results,
      resultCount,
      searchId,
      message: `Found ${resultCount} high-quality matches`,
      quality
    };
  } else {
    return {
      success: false,
      results: [],
      resultCount: 0,
      searchId,
      message: 'No matches found with current search quality',
      quality
    };
  }
}

// Generate mock search results
function generateMockResults(count, quality) {
  const results = [];
  const baseScore = quality === 'ultimate' ? 0.9 : quality === 'premium' ? 0.8 : 0.7;

  for (let i = 0; i < count; i++) {
    results.push({
      id: `result_${i + 1}`,
      title: `Video Result ${i + 1}`,
      thumbnail: `https://picsum.photos/300/200?random=${i}`,
      score: baseScore + (Math.random() * 0.1),
      duration: Math.floor(Math.random() * 3600) + 60, // 1-60 minutes
      source: ['YouTube', 'Vimeo', 'TikTok', 'Instagram'][Math.floor(Math.random() * 4)],
      tags: ['AI', 'Search', 'Video', 'Match'].slice(0, Math.floor(Math.random() * 4) + 1)
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

// Log search activity for analytics
async function logSearchActivity(userId, planId, searchResult) {
  try {
    // This could be expanded to store search logs in database
    console.log(`Search activity - User: ${userId}, Plan: ${planId}, Success: ${searchResult.success}, Results: ${searchResult.resultCount}`);
    
    // Optional: Store in database for analytics
    // await prisma.searchLog.create({
    //   data: {
    //     userId: parseInt(userId),
    //     planId: planId ? parseInt(planId) : null,
    //     success: searchResult.success,
    //     resultCount: searchResult.resultCount,
    //     searchId: searchResult.searchId,
    //     quality: searchResult.quality
    //   }
    // });
  } catch (error) {
    console.error('Failed to log search activity:', error);
  }
}

module.exports = router;
