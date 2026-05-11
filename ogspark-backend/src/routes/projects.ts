import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';
import { validateRequest, projectSchemas } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', ProjectController.getProjects);
router.post(
  '/',
  validateRequest(projectSchemas.create),
  ProjectController.createProject
);
router.get('/stats', ProjectController.getProjectStats);
router.get('/:id', ProjectController.getProject);
router.put(
  '/:id',
  validateRequest(projectSchemas.update),
  ProjectController.updateProject
);
router.delete('/:id', ProjectController.deleteProject);

export default router;