import { Request, Response } from 'express'

const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ error: 'Not found' })
}

export default notFoundHandler
