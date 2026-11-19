import { Router } from 'express'
import { listNeighborhoods } from '../controllers/neighborhood.controller.js'

export const neighborhoodRouter = Router()

neighborhoodRouter.get('/', listNeighborhoods)
