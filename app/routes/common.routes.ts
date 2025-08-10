import commonController from "../controller/common.controller";
import express from 'express'
import { authChecker } from "../middelware/auth.middleware";
import { upload } from "../middelware/multer.middleware";

const commonRouter = express.Router()

commonRouter.post('/multi-skills/create',authChecker,commonController.createOrReturnMultipleSkillIDs)
commonRouter.post('/single-candidate/create',authChecker,commonController.createSingleCandidate)
commonRouter.get('/candidate/filter',authChecker,commonController.getFiltredCandidates)
commonRouter.post('/bulk-candidates/create',authChecker,upload.single('file'),commonController.createBulkCandidate)
/*
** ======= EJS RENDERS =============== 
*/
commonRouter.get('/create-candidate', authChecker,commonController.renderCreateCandidate)
commonRouter.get('/bulk-candidates', authChecker, commonController.renderBulkUploadCandidates)
commonRouter.get('/candidate-list',authChecker,commonController.renderCandidateList)

export default commonRouter