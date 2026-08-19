const express = require('express');
const router = express.Router();
const buildsController = require('../controllers/buildsController');
const { authMiddleware } = require('../middleware/auth');

// Public routes
router.get('/', buildsController.getBuilds);
router.get('/available-parts', buildsController.getAvailableParts);
router.get('/user/:userId', authMiddleware, buildsController.getUserBuilds);
router.get('/:id', authMiddleware, buildsController.getBuildById);
router.post('/compatibility', buildsController.checkBuildCompatibility);
router.post('/cross-match', buildsController.crossMatchBuildParts);

// Protected routes
router.post('/', authMiddleware, buildsController.createBuild);
router.put('/:id', authMiddleware, buildsController.updateBuild);
router.delete('/:id', authMiddleware, buildsController.deleteBuild);
router.post('/:id/like', authMiddleware, buildsController.likeBuild);
router.delete('/:id/like', authMiddleware, buildsController.unlikeBuild);
router.post('/:id/comments', authMiddleware, buildsController.addComment);

module.exports = router;
